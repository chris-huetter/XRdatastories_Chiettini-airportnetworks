# Where memes meet: 3D sets, data and engine spec

The eighteenth story of the app: `stories/memes.js`, built from `tools/memes/` like the CDK5 story is built from
`tools/cdk5/` (read `tools/cdk5/SPEC.md` once: the same rules, the same kind of builders' split). The source is the Menche
lab's repository **Memes_Data** (github.com/menchelab/Memes_Data, Christiane Hütter): 29,610 memes from Know Your Meme
(knowyourmeme.com, scraped 2022-2023), their tags, the authors' two 3D layouts and three one-year snapshots. Everything is
in `MEMES_DATA` (below). Two builders: **A** builds the `cloud` set; **B** builds the `year` set and the engine. The
integrator does everything outside `tools/memes/` (list entry done, icon, tests, narration, docs).

Card (in `stories/list.js` already): key `memes`, kick "Internet culture", title **Where memes meet**, colour `#ff8c42`,
thing `cloud`, loading "Gathering 29,610 memes", icon `memes.cloud` (the integrator's).

## Decisions (the owner's, 19 November 2026)

- **Use the repository's layouts**: both 3D layouts (the archive by tag similarity, 29,610 memes; the tag network's
  eigenvector layout, 17,243 memes with links weighted by shared tags) and the three topic snapshots (2D in the
  repository: lift them into 3D). The city layout and the year spheres of the scene notebooks are not in the repository:
  not used.
- **End with a hypothesis, ideally one found by embodied exploration, not on a screen.** The data's (the integrator's
  analysis, numbers in `MEMES_DATA.hyp`, method in the generator's header): in the tag network's layout the outside is a
  shell of tight niches (the outer 10 %: a median of 36 links, 2 % of them to other communities), the inside a commons of
  classics (the inner 10 %: 10 links, a third to other communities: Doge, Grumpy Cat, Nyan Cat, Advice Dog). How far in a
  meme sits follows how much it crosses communities (Spearman rho -0.34; -0.35 to -0.36 for other community splits), not
  how often it was viewed (rho -0.01) nor its year (0.03). **The hypothesis**: a meme reaches everyone by crossing
  communities, not by being seen most; the commons is where crossing memes gather. A prediction to test: in a later
  scrape, memes that cross communities now should outlast niche ones. **Say honestly what is embodied about it**: it is
  what you notice standing in the middle of the map, the commons all round you and its links reaching out to every wall;
  from outside the niches cover it (about 45 % of the commons hidden behind other memes on average over 80 outside
  views, against 11 % of the shell), so a screen shows the shell first, though a 2D view can still tell centre from edge
  (AUC 0.98). Never claim a screen cannot show it. It is a hypothesis from tag similarity: tags are editors' labels, not
  who shared what; the layout is the authors', distances are not measurements.
- **No images**: never Know Your Meme's pictures or thumbnails (their copyright); memes are glowing points with names.
- **Content**: 1,706 memes flagged by their own tags (pornographic, shock media, gore, racist) or a crude word or slur in their name (the generator's FLAG_NAME) have no name in the data
  (`MDATA.name(i)` is ''): they stay unnamed points, never labelled, never searchable, never examples. Do not add names
  from anywhere. Choose example names only from `hyp.core`, `hyp.shellEx` and memes with names, and avoid crude ones.
- **British spelling**, English only; plain words for a lay audience; the technical layer in small print.

**The rules for sets are the tour's** (`tools/lbi/SPEC.md` top to "Palette and look"; `tools/lbi/kit.js`), as in the
CDK5 story: harness `tools/memes/harness.html` (`?set=cloud&p=...&cam=...&with=year`), `shot.mjs`, `sweep.mjs`; shared
globals in this order: `MEMES_DATA` (`sets/data.js`, generated: never edit or read whole, 1.7 MB), `MDATA` (`sets/mdata.js`:
**read its header, it is the data's API**), `MLOOK` (`sets/look.js`), `TLOOK` (`tools/topo/sets/look.js`, unchanged), then
`cloud`, `year`. Budget per set: build under 400 ms headless, at most 20 draw calls, at most about 60k line segments
drawn at once, no allocation per frame, pure `update(S, t)`. A Quest draws it at 72 fps.

## Look

The authors' colours (`MLOOK`): memes pale cyan `#aaffff`, links blue `#00abff` (or grey), communities the hsv palette
(`MLOOK.com(k)`; the eight tiny ones grey), archive memes with no link faint `#5a6878`; ours: the commons warm gold
`#ffd36b`, a crossroads meme's links to other communities amber `#ffb43b`, a picked meme cyan `#46d9ff`, a snapshot's hot
topic magenta `#ff5ad9`. Glowing points with names as labels; no pictures.

Frames: `cloud` centred on the origin, each layout with 90 % of its memes within radius 1.2 (`MDATA.archive`, `MDATA.net`);
`year` in its own frame (a disc of radius about 1 on the floor plane y = 0, things rising to about y = 0.8). In a
headset 1 unit is about 0.5 m at the default size; standing inside puts you at the cloud's centre, the commons round you
(radius about 0.33, so about 1 m at 3 m a unit; the engine's to tune: nothing within 0.35 m of the eyes).

## The data: `MEMES_DATA` and `MDATA`

`python3 -I tools/memes/data/gen_data.py <folder of the Memes_Data clone>` (a minute; numpy, scipy, scikit-learn,
networkx); `node tools/memes/test-data.mjs` checks it. In short (the header of `sets/mdata.js` has the API):
- 29,610 memes: `name(i)` ('' for unnamed or flagged), `year(i)`, `views(i)`, `search`, `find`; the archive layout
  `archive` (11,906 memes with no link there: `jcAlone`; 12,120 pieces: `jcComponents`).
- The tag network: 17,243 memes (`eig(k)` / `netOf(i)`), its layout `net`, 27 communities (`com(k)`, `coms`: size, top
  tags, centre; the largest: music, social platforms, image macros, 4chan, politics, general memes, anime, film, games,
  streamers, creepypasta, phones, TV, covid, cartoons, sport, French TV, gym, adverts, wrestling), each meme's kept links
  (`nb`, `w`: its 12 strongest, both ways; 117,840 of 387,453) and over all its links `deg(k)`, `foreign(k)`; `tags(k)`;
  `radius(k)`, `band(k)` (0 inner 10 %, 1 inner 25 %, 2 middle, 3 outer 25 %, 4 outer 10 %; `RADII`).
- The snapshots `subs`: politics (all 1,945 memes of 2020, the hot topic politics, trump, election, obama), screens
  (2,485 of 2019: television, netflix, disney, streaming, hbo), social media (2,098 of 2020: tiktok, twitter, youtube,
  instagram, tumblr): their 2D places, links and hot-topic marks.
- `hyp`: every number of the hypothesis (above), `core` and `shellEx` (net indices of named examples, most viewed first).
Every number the story shows comes from `MDATA`; none typed in.

## The sets

### `cloud` (builder A; chapters 1, 2, 3, 5, 6, 7; explore's Map, Memes, Communities)

Copy and adapt the CDK5 story's `net` set (`tools/cdk5/sets/net.js`: points on the GPU between two layouts with a seeded
stagger, links following the points, halos, rings, labels, picking, near-eye fade, the veil): the memes between the
authors' two layouts.
- `cloud_layout` 0..1: 0 the archive (all 29,610 at `MDATA.archive`), 1 the tag network (its 17,243 at `MDATA.net`;
  the other 12,367 fade out where they are, or drift a little outward and fade); eased, each meme on its own delay.
- `cloud_alone` 0..1 (layout 0): the memes with no link in the archive dim to faint grey; a tag "11,906 with no link".
- `cloud_links` 0..1: the tag network's kept links (draw at most about 60k at once: e.g. each meme's 3 strongest, more
  when zoomed or for a highlighted group), blue; `cloud_comCol` 0..1: memes and links take their community's colour, tags
  at the 19 named communities' centres (two of their tags each, e.g. "Music · rap, hip hop"), at most about 6 facing
  you at once.
- `cloud_shell` 0..1: the outer 25 % (band 3 and 4) brightens cool, the rest dims; tags "the niches · 2 % of their links
  leave their community" (`hyp.bands.outer10.foreign`). `cloud_commons` 0..1: the inner 10 % (band 0) glows gold, the
  rest dims; tag "the commons · a third of their links reach other communities". `cloud_cross` 0..1: the commons' links
  to other communities drawn amber, reaching out to the shell (their kept links whose ends differ in community).
- `cloud_core` 0..1: names on the commons' classics (`hyp.core`, a few at a time, facing you); `cloud_pick` (step: -1 or
  a net index; its ring, name, tags, its links lit, its community, its band and foreign share in a tag).
- `cloud_com` (step: -1 or a community: lit, the rest dim).
- Anchors: `centre`, `top`, `commons` (the commons' middle), `shell`, `pick`, `com(k)`, `meme(k)` functions.
- Views: `default` (the whole cloud from outside), `side`, `close` (into the shell), `inside` (from the centre, the
  commons round you), `above`.
- `api()`: `pick(rc)` (world rays: the nearest meme to the ray within a small angle, -1 none), `pos(k, out)`,
  `eye(x, y, z)`.

### `year` (builder B; chapter 4; explore's Years)

The three snapshots, one at a time (`year_which` step 0 politics 2020, 1 screens 2019, 2 social media 2020), each a
glowing disc of its year's memes at their 2D places (radius about 1) on the plane y = 0 with its links faint, and its hot
topic's memes rising out of it (`year_rise` 0..1) to about y = 0.4 to 0.8 in magenta, each hot word's memes at its own
height, with tags ("trump · 35 memes", "tiktok · 193"), and the year as a tag. `year_fade` between snapshots. Anchors
`centre`, `top`, `hot(j)`; views `default`, `low`, `above`; `api().pick(rc)` for its memes (archive indices).

## The engine (`tools/memes/engine/`, copied from the CDK5 story's; builder B)

Copy `tools/cdk5/engine/` and adapt as builder B did there: `SET_ORDER = ['cloud', 'year']`, `HOST.register('memes',
...)`, `XR_HERE = 'memes'`, `audio/narration-memes.mp3`, a placeholder `NARRATION_SYNC`/`NARRATION_ENDS` (the
integrator narrates), **every shared line identical** (diff against `tools/cdk5/engine/` and `tools/flock/engine/`
before finishing). Keep narrated text to about 430 words over about 7.5 minutes of story time (the CDK5 story's lesson:
`narrate.mjs` gives each stretch at least 1.1 x its story time; small print and lists that only repeat the text carry
`data-say=""`).

**Chapters** (about 7.5 minutes; story times are a guide; plain sentences first, small print after):

1. `title` 0-50, **Every meme on file** (`cloud` layout 0, growing in; `cloud_alone`). "Know Your Meme documents
   internet memes: 29,610 of them here, from the 1990s to 2022, each with its tags. Placed by the tags they share, the
   memes that share tags sit together; 11,906 share too few to be tied to any." Small print: the archive layout (Jaccard
   similarity of tags, UMAP in 3D, the authors'); scraped 2022 to 2023; no pictures (copyright), only names; 1,706 memes not
   named (their tags mark them pornographic, shock media, gore or racist).
2. `tied` 50-110, **Tied by tags** (layout 0 to 1, `cloud_links`). "Tie two memes when they share tags, more strongly
   the more they share. 17,243 memes form one network: 387,453 ties." Small print: the authors' eigenvector layout; the
   links weighted by shared tags; we draw each meme's strongest few.
3. `neighbourhoods` 110-180, **Neighbourhoods** (`cloud_comCol`, a slow turn). "Groups that tie mostly among themselves
   stand out: music, the big platforms, image macros, 4chan, politics, anime, films, games, streamers..." (names from
   `coms`). Small print: Louvain on the weighted ties (ours), 27 groups, 8 of them tiny; named by their most typical
   tags.
4. `year` 180-250, **A year in memes** (`year`: the three snapshots, hot topics rising). "Take one year at a time. In 2019
   the hot topic was television and streaming; in 2020, politics, with the election and Trump, and on social media,
   TikTok." (counts from `subs`). Small print: the authors' annual networks (2D, lifted here: the hot topics rise).
5. `niches` 250-320, **Niches on the outside** (back to the cloud, `cloud_shell`). "From outside, the cloud is a wall of
   niches. Memes out here are tied tightly to their own: a median of 36 ties, and only 2 % of them reach another group."
6. `commons` 320-400, **The commons inside** (in a headset: stand inside, the commons round you; on a screen fly in;
   `cloud_commons`, `cloud_cross`, `cloud_core`). "Step inside and it changes. At the centre sit the classics: Doge, Grumpy
   Cat, Nyan Cat. They have fewer ties, but a third of them reach other groups. From here, their ties run out to every
   wall." Small print: inner 10 % against outer 10 % (`hyp.bands`); from outside about 45 % of the commons is hidden
   behind other memes on average, 11 % of the shell.
7. `hypothesis` 400-460, **A hypothesis** (stay inside; the crossroads' ties pulse outward). "Here is what standing in the
   middle suggests: a meme does not reach everyone by being seen most. How central a meme is follows how far it crosses
   between groups, not its views or its year. Crossing may be what turns a niche joke into a shared classic. A test: in
   a later archive, today's crossing memes should outlast the niche ones." Small print: Spearman rho -0.34 (crossing),
   -0.01 (views), 0.03 (year); the same for other community splits (-0.35 to -0.36); a hypothesis from tag similarity:
   tags are editors' labels, not who shared what; the layout is the authors'; a 2D view still tells centre from edge
   (AUC 0.98), so it is noticing, not proof, that standing inside gives. Credits: the Menche lab's Memes_Data repository
   (Christiane Hütter), Know Your Meme; ours: the communities, the measures, the snapshots' lift.

In a headset chapters 6 and 7 stand you inside the cloud (the commons round you, the shell as walls); elsewhere the cloud
floats in front of you; nothing within 0.35 m of the eyes.

**Explore** (HTML and canvas twins): **Map** (archive or tag network, links, communities coloured, shell, commons, Stand
inside), **Memes** (search by name; the picked meme: its year, views, tags, community, ties and their share to other
groups, its band, its strongest ties named), **Communities** (the 19 named: pick one, its size, tags, how central),
**Years** (the three snapshots), **About**. `collab.state()`: `{ tab, layout, ctl, meme, com, which }` (never the search
text, the camera or standing inside). Hashes: `#memes&t=100`, `#memes&explore&layout=archive`, `&q=Doge`, `&com=3`,
`&tab=years&which=1`, `&inside`, `&now=1`.

Sound cues (as the CDK5 story's): `grow` as the archive appears, `link` sequences as ties form, `whoosh` on layout
changes, `rise` for the hot topics, `ping` for the classics, `pulse` for the ties running out; 6 to 60 cues.

## Testing

- `node tools/memes/test-data.mjs`; `node tools/memes/build.mjs --check`.
- A set alone: `node shot.mjs cloud "p=cloud_layout:1,cloud_comCol:1&cam=default" a 640 400` from `tools/memes` (serve the
  repository root on 8123; Node 22 first on PATH: `export PATH=/Users/chris/.nvm/versions/node/v22.16.0/bin:$PATH`).
- The story: `node sweep.mjs <prefix> "30,100,200,300,380,440"`; then `node tools/smoke.mjs http://127.0.0.1:8123/ --only
  memes` once the integrator has added the story's key to the smoke test (ask).
- Screenshots in `/private/tmp/claude-501/-Users-chris-Desktop-Github-XRdatastories-Chiettini-airportnetworks/67a63163-d030-49e3-bacf-2b013ee6df76/scratchpad/memes-shots/`
  (`SHOTS=<that folder>`), 640 x 400, at most about 20 per builder.
- Report headset behaviour as untested.
