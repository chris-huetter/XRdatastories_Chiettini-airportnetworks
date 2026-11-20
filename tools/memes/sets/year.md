# year: the three one-year snapshots

The authors' annual topic networks (`MDATA.subs`: the Memes_Data repository's subnetworks), one at a time: **politics**
(all 1,945 memes of 2020 in their politics topic; hot words election, obama, politics, trump), **screens** (2,485 of
2019: disney, hbo, netflix, streaming, television) and **social media** (2,098 of 2020: instagram, tiktok, tumblr,
twitter, youtube). Each is a glowing disc of its memes at the authors' 2D places (radius about 1, up to 1.4) on the floor
plane y = 0, in the year colour (`MLOOK.C.year`), its links faint blue; the memes the authors mark with a hot word rise out
of the disc in magenta (`MLOOK.C.hot`), each hot word's memes at a height of its own (0.4 to 0.8, in the order of
`hot`, a seeded few cm of spread), with a faint stem down to where they stood and a soft glow over each word's group.
Ours: the lift into 3D (the heights, the stagger, the stems, the glows); the places, links and hot marks are the
authors'. Its own frame (not the cloud's).

## Params

| Param | Range | What |
| --- | --- | --- |
| `year_a` | 0..1 | fade (the engine's) |
| `year_which` | step: 0, 1, 2 | the snapshot on show: 0 politics, 1 screens, 2 social media (only that one is drawn) |
| `year_fade` | 0..1 | the snapshot on show fades (the engine dips it to 0 to change snapshots, and jumps `year_which` there) |
| `year_rise` | 0..1 | the hot topics rise (each meme on a seeded delay of up to 0.3; a function of the param alone); the rest of the disc dims a little; links between two hot memes magenta, links up to one fainter |

Defaults: `year_which` 0, `year_fade` 1, `year_rise` 1.

## Labels, anchors, views

Labels: the year over the disc ("2020 · politics · 1,945 memes", at `top`, while its snapshot shows), and each hot word over
its memes once they have risen ("trump · 35 memes", "tiktok · 193 memes": `MDATA.subs[].hotN`; words under 10 memes are
`minor`). Anchors: `centre` [0, 0, 0], `top` [0, 1.02, 0], `hot0`..`hot4` (the snapshot on show's hot word j: over its
memes' middle at their height now). Views: `default` [0, 30, 4.0, 0, 0.3, 0], `low` [24, 9, 3.8, 0, 0.38, 0], `above`
[0, 78, 4.1, 0, 0, 0].

## api()

`pick(rc)` (a THREE.Raycaster in world coordinates: the nearest **named** meme of the snapshot on show within about 1.3
degrees, its archive index, or -1; unnamed and flagged memes are never picked), `pos(i, out)` (an archive meme's place
now in the snapshot on show, or null), `hot(j, k)` (hot word j's tag point, snapshot k, default the one on show),
`snapshots()` (`[{ key, title, year, n, links, hot: [[word, memes]] }]`, for the panes).

## Cost

Build about 20 to 70 ms headless (all three snapshots' buffers at once). Draw calls: 4 at most (the snapshot on show's
points and lines, the rim, the glows); points up to 2,485, segments up to 8,366 plus the stems. `update` sets uniforms and
refills a ring and up to five glows; no allocation per frame (the label points are kept arrays).

## Untested

How the risen topics read life size in a headset, and the 0.4 to 0.8 heights at the default size (about 0.2 to 0.4 m).
