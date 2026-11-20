// Where memes meet: 29,610 internet memes from Know Your Meme, placed by the tags they share. The archive (every meme by
// tag similarity, the authors' 3D layout; 11,906 share too few tags to be tied to any), the tag network (17,243 memes
// tied by shared tags, 387,453 ties, the authors' eigenvector layout) and its neighbourhoods (our communities), three
// one-year snapshots (the authors' topic subnetworks, lifted into 3D: their hot topics rise), and a hypothesis that
// standing inside the network suggests: a shell of tight niches outside, a commons of classics inside whose ties cross
// between groups. After the Menche lab's Memes_Data repository (github.com/menchelab/Memes_Data, Christiane Hütter).
// Every place, link and hot mark is the authors' (MEMES_DATA, decoded by MDATA); ours are the communities, the measures
// behind the hypothesis (MEMES_DATA.hyp, the generator's), the tags and the snapshots' lift. No pictures: memes are
// glowing points with names, and the memes flagged by their own tags are never named.
// Runs inside index.html, which owns the page, the renderer and the headset session.
// Built by tools/memes/build.mjs from the tour's kit and the data, look, sets and engine parts in tools/memes: edit
// those, not this file.
HOST.register('memes', function (HOST) {
'use strict';
const D2R = Math.PI / 180;
const $ = s => document.querySelector(s);
const fmt = n => Math.round(n).toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// =================================================================== KIT ==
//@@KIT@@
const K = makeKit(THREE);
const { smooth, clamp } = K;

// ================================================================== SETS ==
// Each set is one 3D scene of the story, centred on the origin. The story fades
// sets in and out and drives them through their params (see SETS.x.params).
// MEMES_DATA (the authors' layouts, links and snapshots and the generator's measures, generated), MDATA (its decoders
// and lookups: no science) and MLOOK (the story's palette) come first, then TLOOK (the tissue topology story's look,
// unchanged: tubes, rings, balls, halos), then the sets: cloud (the memes between the authors' two layouts) and year
// (the three one-year snapshots).
const SETS = {};
//@@SETS@@
