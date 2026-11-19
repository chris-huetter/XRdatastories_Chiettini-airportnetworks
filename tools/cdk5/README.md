# tools/cdk5: the sources of the CDK5 story (`stories/cdk5.js`)

"The switch that sticks": CDK5, a kinase of neurons, among 16,376 human proteins, after the Menche lab's repository
**CDK5_data** (github.com/menchelab/CDK5_data, Christiane Hütter): its **CDK5_analytics** VR project, six scenes on the
whole human interactome made with the lab's cartoGRAPHs. The repository is the lab's own and public; only derived
numbers go into ours. Built like the soil story (`tools/soil/`), with the tour's kit and set contract. British spelling,
English only. Never edit `stories/cdk5.js` by hand.

```sh
node tools/cdk5/test-data.mjs       # checks the data and its decoders (a second)
node tools/cdk5/build.mjs           # writes stories/cdk5.js
node tools/cdk5/build.mjs --check   # exits 1 if out of date
# the data, from a clone of CDK5_data (kept out of the repository), in a Python with numpy, Pillow and scipy:
python3 -I tools/cdk5/data/gen_data.py <folder of the CDK5_data clone>   # sets/data.js (seconds)
```

| Path | What it is |
| --- | --- |
| `data/gen_data.py` | the generator: decodes the analytics project's textures (every protein's place and colour in each of the six scenes, the scenes' links) and input files (the interactome, gene symbols, the two Reactome pathways, the Disease Ontology associations) and computes the over-representation counts. Its header says where every field comes from |
| `sets/data.js` | `CDK5_DATA` (about 1.1 MB). Generated: never edit, never read whole |
| `sets/cdata.js` | `CDATA`: decodes `CDK5_DATA` once and gives the lookups the sets and the engine share (its header is the data's API); no science |
| `sets/look.js` | `CLOOK`: the story's palette (the authors' colours: CDK5 green, hyperactive red, NTRK2 cyan, calpain yellow, the Alzheimer's pathway orange) |
| `sets/net.js` | the interactome in the authors' six arrangements: points that flow from one to the next, the scenes' links, CDK5's halo, its partners, cousins and nearest, the veil, picking (builder A; manifest `net.md`) |
| `sets/core.js` | the close-up at the map's centre: each scene's centre proteins as lit balls with their names, the links among them as tubes, the signal's pulses, the cut and CDK5 turning red (manifest `core.md`). The build adds the tissue topology story's look (`TLOOK`), unchanged |
| `engine/e1_head.js` ... `e7_app.js` | the story engine, copied from the soil story's (its shared lines kept identical: diff them against `tools/soil/engine/` and `tools/flock/engine/` when either changes). The story's own parts: the two sets in one frame and the core following the net's points (`e2_scene.js`); the eight chapters, their text from `CDATA` (`FACTS`), keys, cameras, cues and the pace (`NARRATION_SYNC`, `NARRATION_ENDS`: `node tools/voice/narrate.mjs cdk5` writes both) in `e3_story.js`
(chapters, keys, cues and lines are authored in seconds and run at `K_T`, 0.9, of them; small print carries `data-say=""`
so the narration leaves it out); explore's tabs Scenes, Proteins, Diseases and About, the shared state and picking in `e4_explore.js`; the headset's placement (the default size, clearance from the eyes, standing inside) in `e5_xr.js`; the headset twins of the panes in `e6_panels.js`; explore's start and the links in `e7_app.js` |
| `SPEC.md` | what the data, the sets and the engine must do (with the owner's decisions); read with `tools/lbi/SPEC.md` |
| `build.mjs` | the assembler |
| `harness.html`, `shot.mjs`, `sweep.mjs` | one set alone (`&with=<set>` adds the other), its screenshots, and screenshots of the whole story (`SHOTS=<dir>`, `PORT=<port>`) |

**The authors'**: the interactome (16,376 proteins, 309,355 links), every layout of the six scenes (the map of
processes, a sphere by Gene Ontology biological processes; the centres of scenes 1 to 4; the disease landscape by
Disease Ontology associations), every colour and every link drawn, the two pathways' members (Reactome) and the
proteins' disease associations. The one link the authors added, CDK5 - calpain in scene 3, is not an interaction of the
interactome: the story says so. **Ours**: the close-ups at the centre (balls, tubes and names, at the authors' relative
places scaled up), the tags with numbers, the signal's pulses, and the over-representation counts (hypergeometric, over
the 6,538 proteins with any disease association; said "in this map", with the caveat that well-studied proteins have
more known partners and diseases).

Explore links: `#cdk5&t=100` (a story time), `#cdk5&explore&scene=disease` (`bioproc`, `subunits`, `ntrk2`, `calpain`,
`alzheimer`, `disease`, or 0 to 5), `&links=off`, `&shell=faint`, `&cousins=on`, `&near=on`, `&view=<a net view>`,
`&tab=scenes|proteins|diseases|about`, `&q=CDK5R1` (a protein by its symbol), `&term=lissencephaly` (a term by name or
id), `&path=ntrk2|alzheimer`, `&inside` (Stand inside: the map of processes only), `&now=1` (no glide).
