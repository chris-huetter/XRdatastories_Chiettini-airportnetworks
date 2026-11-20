# tools/memes: the sources of the memes story (`stories/memes.js`)

"Where memes meet": 29,610 internet memes from Know Your Meme and the tags that tie them, after the Menche lab's
repository **Memes_Data** (github.com/menchelab/Memes_Data, Christiane Hütter): its memes with their tags, its two 3D
layouts (the archive by tag similarity; the tag network's eigenvector layout) and three one-year topic subnetworks. The
repository is the lab's own and public; only derived numbers go into ours, and never a picture (Know Your Meme's, under
copyright). Built like the CDK5 story (`tools/cdk5/`), with the tour's kit and set contract. British spelling, English
only. Never edit `stories/memes.js` by hand.

```sh
node tools/memes/test-data.mjs       # checks the data and its decoders (a second)
node tools/memes/build.mjs           # writes stories/memes.js
node tools/memes/build.mjs --check   # exits 1 if out of date
# the data, from a clone of Memes_Data (kept out of the repository), in a Python with numpy, scipy, scikit-learn, networkx:
python3 -I tools/memes/data/gen_data.py <folder of the Memes_Data clone>   # sets/data.js (a minute)
```

| Path | What it is |
| --- | --- |
| `data/gen_data.py` | the generator: decodes the repository's memes, layouts and subnetworks, finds the communities (Louvain on the weighted ties) and computes the hypothesis' measures (`MEMES_DATA.hyp`). Its header says where every field comes from |
| `sets/data.js` | `MEMES_DATA` (about 1.7 MB). Generated: never edit, never read whole |
| `sets/mdata.js` | `MDATA`: decodes `MEMES_DATA` once and gives the lookups the sets and the engine share (its header is the data's API); no science |
| `sets/look.js` | `MLOOK`: the story's palette (the authors' pale cyan memes and blue links, their hsv communities; ours: the commons gold, crossing ties amber, hot topics magenta) |
| `sets/cloud.js` | the memes between the authors' two layouts: points that flow from the archive to the tag network, ties, communities, the shell of niches, the commons and its crossing ties, the classics' names, picking (builder A; manifest `cloud.md`) |
| `sets/year.js` | the three one-year snapshots: a disc of each year's memes at the authors' 2D places, its hot topics rising in magenta with their tags (manifest `year.md`). The build adds the tissue topology story's look (`TLOOK`), unchanged |
| `engine/e1_head.js` ... `e7_app.js` | the story engine, copied from the CDK5 story's (its shared lines kept identical: diff them against `tools/cdk5/engine/` and `tools/flock/engine/` when either changes). The story's own parts: the two sets each in its own frame and the scenes' reach for the headset (`e2_scene.js`); the seven chapters, their text from `MDATA` (`FACTS`), the communities' names (`COM_NAME`, our reading of their tags, as the cloud set's), keys, cameras, cues and the pace (`NARRATION_SYNC`, `NARRATION_ENDS`: placeholders until `node tools/voice/narrate.mjs memes` writes both) in `e3_story.js` (small print carries `data-say=""` so the narration leaves it out); explore's tabs Map, Memes, Communities, Years and About, the shared state and picking in `e4_explore.js`; the headset's placement (the default size, clearance from the eyes, standing inside the cloud at 3 m a unit) in `e5_xr.js`; the headset twins of the panes in `e6_panels.js`; explore's start and the links in `e7_app.js` |
| `SPEC.md` | what the data, the sets and the engine must do (with the owner's decisions); read with `tools/lbi/SPEC.md` |
| `build.mjs` | the assembler |
| `harness.html`, `shot.mjs`, `sweep.mjs` | one set alone (`&with=<set>` adds the other), its screenshots, and screenshots of the whole story (`SHOTS=<dir>`, `PORT=<port>`) |

**The authors'**: every meme's name, year, views and tags, the archive layout (UMAP of the Jaccard similarity of tags, in
3D), the tag network (387,453 ties weighted by shared tags) and its eigenvector layout, and the three annual subnetworks
with their 2D places, links and hot-topic marks. **Ours**: the communities (Louvain, seed 1; seeds 2 to 4 alike) and their
names, the hypothesis' measures (how far in a meme sits against its share of ties to other communities, its views and its
year; how much of the commons is hidden from outside; how well a flat view tells centre from edge), the tags with numbers,
and the snapshots' lift into 3D (the hot topics rise). **Content**: 857 memes flagged by their own tags (pornographic,
shock media, gore, racist) have no name in the data: they stay unnamed points, never labelled, picked or searched.

**The hypothesis** (the last chapter): in the tag network's layout the outside is a shell of tight niches and the inside a
commons of classics whose ties cross between groups; how central a meme is follows how much it crosses (Spearman's rho
-0.34), not its views (-0.01) or its year (0.03). A meme may reach everyone by crossing groups, not by being seen most; a
later scrape could test it. What is embodied about it is what you notice standing in the middle (in a headset the
sixth and seventh chapters stand you there): a flat view can still tell centre from edge, so the story calls it noticing,
not proof.

Explore links: `#memes&t=100` (a story time), `#memes&explore&layout=archive` (or `network`, 0, 1), `&tab=map|memes|
communities|years|about`, `&q=Doge` (a named meme, picked, in the Memes tab), `&com=3` (a community, 0 to 18, or its name),
`&which=1` (a snapshot: 0 politics, 1 screens, 2 social media, or its key), `&links=on|off`, `&colour=groups|plain`,
`&show=none|shell|commons|alone`, `&rise=up|flat`, `&view=<a view of the set on show>`, `&inside` (Stand inside: the tag
network), `&now=1` (no glide).
