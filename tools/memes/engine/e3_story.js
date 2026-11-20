// ================================================================== STORY ==
// Narration timing: [time in the recording, original story cue]. The story's
// animation is stretched or squeezed between these points so each cue lands on
// the matching sentence. A placeholder until the story is narrated (story time is
// the recording's time): node tools/voice/narrate.mjs memes writes this table and
// NARRATION_ENDS from the recording it makes (each stretch lasts the longer of
// 1.1 times its story time and its line's audio plus a pause); run it again after
// the text changes (see tools/voice/README.md).
const NARRATION_SYNC = [
  [0, 0], [1.32, 1.2], [3.64, 2.4], [6.9, 5],         // Every meme on file
  [56.4, 50], [57.7, 51.18], [59.53, 51.2],           // Tied by tags
  [124.21, 110], [125.51, 111.18], [127.13, 111.2],   // Neighbourhoods
  [202.81, 180], [204.11, 181.18], [205.92, 181.2],   // A year in memes
  [281.6, 250], [282.9, 251.18], [284.93, 251.2],     // Niches on the outside
  [360.61, 320], [361.91, 321.18], [363.78, 321.2],   // The commons inside
  [450.46, 400], [451.76, 401.18], [453.55, 401.2], [518.23, 460],  // A hypothesis
];
// where each chapter's words end in the recording (seconds by chapter key): the slideshow lets the voice finish there
// (placeholders, a moment before each chapter's end, until the story is narrated)
const NARRATION_ENDS = { title: 36.95, tied: 99.4, neighbourhoods: 168.75, year: 260.55, niches: 304.65, commons: 404.9, hypothesis: 495.8 };
// recording time -> original story time
function storyT(t) {
  const W = NARRATION_SYNC;
  if (t <= 0) return 0;
  for (let i = 1; i < W.length; i++) {
    if (t <= W[i][0]) { const [n0, o0] = W[i - 1], [n1, o1] = W[i]; return o0 + (o1 - o0) * (t - n0) / (n1 - n0); }
  }
  return W[W.length - 1][1] + (t - W[W.length - 1][0]);
}
// original story time -> recording time
function narrT(o) {
  const W = NARRATION_SYNC;
  for (let i = 1; i < W.length; i++) {
    if (o <= W[i][1]) { const [n0, o0] = W[i - 1], [n1, o1] = W[i]; return n0 + (n1 - n0) * (o - o0) / (o1 - o0); }
  }
  return W[W.length - 1][0] + (o - W[W.length - 1][1]);
}
let T_END = NARRATION_SYNC[NARRATION_SYNC.length - 1][0];
// (the chapters and every key, cue and line are authored in seconds as below and run at K_T of them: the story's own
// clock; 1 here, the narration paces it)
const K_T = 1;
const CH0 = [
  { key: 'title', name: 'Every meme on file', a: 0, b: 50 },
  { key: 'tied', name: 'Tied by tags', a: 50, b: 110 },
  { key: 'neighbourhoods', name: 'Neighbourhoods', a: 110, b: 180 },
  { key: 'year', name: 'A year in memes', a: 180, b: 250 },
  { key: 'niches', name: 'Niches on the outside', a: 250, b: 320 },
  { key: 'commons', name: 'The commons inside', a: 320, b: 400 },
  { key: 'hypothesis', name: 'A hypothesis', a: 400, b: 460 },
];
const CH = CH0.map(c => Object.assign({}, c, { a: c.a * K_T, b: c.b * K_T }));
CH.forEach(c => { c.na = narrT(c.a); c.nb = narrT(c.b); }); // chapter times on the recording's clock
const C = Object.fromEntries(CH.map(c => [c.key, c]));
const C0 = Object.fromEntries(CH0.map(c => [c.key, c]));   // (authored times: buildStory's keys scale them)

// every param of every set, at rest; the sets themselves start hidden
const DEF = {};
// params eased on a log scale in the story and in explore (a set lists its own as log): none of the engine's
const LOG = new Set([]);
function buildDefaults() {
  for (const k of SET_ORDER) Object.assign(DEF, GL.sets[k].params);
  for (const k of SET_ORDER) DEF[k + '_a'] = 0;
  for (const k of SET_ORDER) for (const n of GL.sets[k].log || []) LOG.add(n);
}
const TR = {};
const key = (n, t, v) => { (TR[n] = TR[n] || []).push([t * K_T, v]); };   // (t authored: see K_T)
const ramp = (n, t0, t1, v0, v1) => { key(n, t0, v0); key(n, t1, v1); };
// a value eased on a log scale: between log(v0) and log(v1)
const logMix = (v0, v1, x) => (v0 > 0 && v1 > 0 ? Math.exp(Math.log(v0) + (Math.log(v1) - Math.log(v0)) * x) : v0 + (v1 - v0) * x);
function evalTrack(n, t) {
  const ks = TR[n];
  if (!ks) return DEF[n];
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i][0]) {
      const [t0, v0] = ks[i - 1], [t1, v1] = ks[i];
      if (t1 <= t0) return v1;
      return LOG.has(n) ? logMix(v0, v1, smooth((t - t0) / (t1 - t0))) : v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0));
    }
  }
  return ks[ks.length - 1][1];
}
function storyState(t) {
  const s = {};
  for (const n in DEF) s[n] = evalTrack(n, t);
  return s;
}
const fadeVal = (t, a, b, d) => (t <= a || t >= b ? 0 : Math.min(smooth((t - a) / d), smooth((b - t) / d)));

const ST = { labels: [], items: [], stand: [] };
// a set's camera view by name (falls back to its default view)
// (with the story's own framing on top: FIT)
const view = (k, name) => {
  const c = GL.sets[k].cam, v = (c[name] || c.default).slice(), f = c[name] && FIT[k] && FIT[k][name];
  if (f) for (let i = 0; i < f.length; i++) v[i] += f[i];
  return v;
};
// the part of a view's FIT that moves its target clear of the side panel: on a screen without one (a phone, a narrow
// window) applyCamera takes it back, so the view stays centred there
const fitShift = (k, name) => { const f = GL.sets[k].cam[name] && FIT[k] && FIT[k][name]; return f ? [f[3] || 0, f[4] || 0, f[5] || 0] : [0, 0, 0]; };
// views whose parts reach under the side panel or off the right edge on a landscape screen: a little further back, or
// their target moved (added to the set's own view, in story and explore mode alike)
const FIT = { cloud: { default: [0, 0, 0.3, 0, 0, 0], side: [0, 0, 0.3, 0, 0, 0] }, year: { default: [0, 0, 0.5, 0, 0, 0] } };
// how much further back a view stands on a phone held upright (see narrowK): the whole cloud and the whole disc
const NARROW = { cloud: { default: 1.2, side: 1.2, above: 1.2 }, year: { default: 1.25, low: 1.25, above: 1.2 } };
const narrowOf = (k, name) => (NARROW[k] && NARROW[k][name]) || 1;
// on a screen held sideways but too narrow for the side panel (the panel below, the scene in a strip above it, see
// lowK): [distance factor, the target's shift up]
const LOW = {};
const LOW1 = [1, 0];
const lowOf = (k, name) => (LOW[k] && LOW[k][name]) || LOW1;
// a set's anchor point, in the set's own coordinates
function anchorOf(k, at) {
  const s = GL.sets[k];
  let p = typeof at === 'string' ? s.anchors[at] : at;
  if (typeof p === 'function') p = p();
  return p || [0, 0, 0];
}

// ------------------------------------------------------------------- data --
// Every number the story shows is the authors' (MEMES_DATA: their memes, tags, layouts and snapshots) or the
// generator's documented measures (its communities and the hypothesis' numbers, MEMES_DATA.hyp), looked up through
// MDATA. Nothing scientific is computed here.
const MD = MDATA;
const pct = v => (Number.isFinite(+v) ? `${Math.round(100 * v)} %` : '–');
const word = n => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n] || String(n);
const cap = s => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');
const num = (v, d) => (v === null || v === undefined || !Number.isFinite(+v) ? '–' : (+v).toFixed(d));
const listAnd = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
// a share in words, as the story says it (a third, a quarter, else a percentage)
const shareWords = v => (Math.abs(v - 1 / 3) < 0.02 ? 'a third' : Math.abs(v - 0.25) < 0.02 ? 'a quarter' : Math.abs(v - 0.5) < 0.02 ? 'half' : pct(v));
const rho = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);
// the communities' names: our reading of each one's most typical tags (MDATA.coms[k].tags), the 19 named ones
// (by size; the eight tiny ones, under about 50 memes, have none). Names, not numbers: the generator writes none
const COM_NAME = ['Music', 'Social platforms', 'Image macros', '4chan', 'Politics', 'General memes', 'Anime', 'Film', 'Games',
  'Streamers', 'Creepypasta', 'Phones', 'TV', 'Covid', 'Cartoons', 'Sport', 'French TV', 'Gym', 'Adverts'];
// (one source of names: the cloud set's, api().comName, once the sets exist; COM_NAME, the same words, only for text
// written before they do: FACTS)
const cloudApi = () => (GL.sets && GL.sets.cloud && GL.sets.cloud.api ? api('cloud') : null);
const comName = k => { const A = cloudApi(); return k < 0 || k >= MD.coms.length ? 'none' : A && A.comName ? A.comName(k) : COM_NAME[k] || 'A small group'; };
// the named groups (0 .. named - 1), by the set's count when it gives one
const comNamed = () => { const A = cloudApi(); return A && A.named ? A.named : COM_NAME.length; };
const comNames = () => Array.from({ length: comNamed() }, (_, k) => comName(k));
// the communities as the text lists them (lower case; "the big platforms"; general memes left out: not a topic)
const COM_SAY = { 1: 'the big platforms', 7: 'films' };
const comSay = k => COM_SAY[k] || (/^\d/.test(COM_NAME[k]) ? COM_NAME[k] : COM_NAME[k].toLowerCase());
// a meme's name (archive index); '' for the unnamed and the flagged (never shown)
const memeName = i => (i >= 0 ? MD.name(i) : '');
// named examples, from the data's own lists in their order (hyp.core: the commons' classics, hyp.shellEx: the shell's
// niches, both most viewed first), skipping any without a name (flagged by their own tags or a crude name): archive
// indices
const exOf = list => (list || []).map(k => MD.eig(k)).filter(i => i >= 0 && MD.name(i));
// what the unnamed are, wherever the story or explore says how many there are
const FLAG_WORDS = 'flagged by their own tags (pornographic, shock media, gore or racist) or by a crude name';

// ------------------------------------------------------------------ facts --
// Numbers the story quotes, all from MEMES_DATA (SPEC.md, "The data")
const FACTS = (() => {
  const F = MD.facts, H = MD.hyp, B = H.bands, sub = k => MD.subs.find(s => s.key === k) || MD.subs[0];
  const hot = (s, w) => { const f = (s.hotN || []).find(x => x[0] === w); return f ? f[1] : 0; };
  const P = sub('politics'), Sc = sub('screens'), So = sub('socialmedia');
  const seeds = (H.seeds || []).map(x => x.rho), core = exOf(H.core);
  return {
    memes: F.memes, y0: F.years[0], y1: F.years[1], flagged: F.flagged, alone: F.jcAlone, pieces: F.jcComponents,
    linked: F.linked, links: MD.netLinks, kept: MD.kept, coms: F.communities, named: COM_NAME.length, tiny: F.communities - COM_NAME.length,
    outer: B.outer10, inner: B.inner10, innerN: B.inner10.n,
    rhoF: H.rhoForeign, rhoV: H.rhoViews, rhoY: H.rhoYear, rhoD: H.rhoDeg, seedLo: seeds.length ? Math.min(...seeds) : H.rhoForeign, seedHi: seeds.length ? Math.max(...seeds) : H.rhoForeign,
    hidIn: H.hidden.inner[1], hidSh: H.hidden.shell[1], auc: H.auc2d[1],
    core, coreNames: core.map(i => MD.name(i)), shell: exOf(H.shellEx),
    pol: { y: P.year, n: P.n, trump: hot(P, 'trump'), election: hot(P, 'election'), politics: hot(P, 'politics') },
    scr: { y: Sc.year, n: Sc.n, tv: hot(Sc, 'television'), streaming: hot(Sc, 'streaming'), netflix: hot(Sc, 'netflix') },
    soc: { y: So.year, n: So.n, tiktok: hot(So, 'tiktok'), twitter: hot(So, 'twitter') },
    say: [0, 1, 2, 3, 4, 6, 7, 8, 9].map(comSay),
  };
})();
// the credits: the last chapter's small print and explore's About pane (page and headset)
const OURS = 'Ours: the communities (Louvain on the weighted ties) and their names, the measures behind the hypothesis, the tags with numbers, and the snapshots\' lift into 3D (their hot topics rise).';
const ABOUT = `After ${MD.about}. The authors': every meme's name, year, views and tags, the archive layout (UMAP of tag similarity in 3D), the tag network and its eigenvector layout, and the three snapshots with their hot topics. ${OURS} No pictures (Know Your Meme's, under copyright): memes are points with names; ${fmt(FACTS.flagged)} memes ${FLAG_WORDS} stay unnamed points. Tags are editors' labels, not who shared what; the layouts are the authors', and distances on them are not measurements.`;
// colours as text on the HTML panel, which is light in the light theme: a colour mixed with the panel's ink (darker on
// a light panel, lighter on a dark one). The headset's panel is dark: its canvas twin takes the colour itself (data-col).
const inkCol = c => `color-mix(in srgb, ${c} 55%, var(--ink))`;
const swCol = c => c;   // a swatch or a bar in the same colour
// the story's colours (SPEC.md, "Look", MLOOK)
const CYAN = '#46d9ff', AMBER = '#ffb43b', GREY = '#8e98ab';
const CC = MLOOK.C;

function buildStory() {
  const F = FACTS;
  // fade a set in over [t0, t1] and out over [t2, t3]
  const show = (k, t0, t1, t2, t3) => { ramp(k + '_a', t0, t1, 0, 1); if (t2 !== undefined) ramp(k + '_a', t2, t3, 1, 0); };
  const hide = (k, t0, t1) => ramp(k + '_a', t0, t1, 1, 0);
  // values a set starts the story with (keyed at time 0, so a set's resting defaults never leak into the story)
  const start = vals => { for (const n in vals) if (n in DEF) key(n, 0, vals[n]); };
  // a big number in a colour of its own (the headset's canvas reads data-col)
  const big = (col, v) => `<b data-col="${col}" style="color:${inkCol(col)}">${v}</b>`;
  // (out: where a part that takes turns with the next fades out)
  const fact = (at, col, v, small, out) => `<div data-at="${at}"${out ? ` data-out="${out}"` : ''}>${big(col, v)}<small>${small}</small></div>`;
  // ------------------------------------------------------------ panel copy
  // parts of a chapter that take turns in one place, each fading out (data-out) as the next comes: the headset's
  // panel cannot scroll, so no chapter shows more than fits at once
  const turns = (...parts) => `<div style="display:grid">${parts.map(p => `<div style="grid-area:1/1">${p}</div>`).join('')}</div>`;
  // small print the narration leaves out (data-say ""; it stays on the panels and in a headset)
  const note = (at, text, out) => `<p class="note" data-say="" data-at="${at}"${out ? ` data-out="${out}"` : ''}>${text}</p>`;
  const quiet = (at, col, v, small, out) => fact(at, col, v, small, out).replace('<div data-at', '<div data-say="" data-at');
  const HOT = CC.hot, GOLD = CC.commons, SHELL = CC.shell, LINK = CC.link;
  const ex = F.coreNames.length >= 3 ? F.coreNames.slice(0, 3) : F.coreNames;
  const html = {
    title: `<svg class="route-mark" viewBox="0 0 360 44" aria-hidden="true"><path id="titleArc" d="M8 36 Q180 -16 352 36" fill="none" stroke="var(--red)" stroke-width="2.2" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><circle cx="8" cy="36" r="4.5" fill="var(--red)"/><circle cx="352" cy="36" r="4.5" fill="var(--red)" id="titleDot" opacity="0"/></svg>
      <h1 data-at="1.2">Where memes meet</h1>
      <p class="lede" data-at="2.4">Internet memes and the tags that tie them</p>
      ${turns(`<p data-at="5" data-out="27.5">Know Your Meme documents internet memes: here are ${fmt(F.memes)} of them, from ${F.y0} to ${F.y1}, each with its tags.</p>
        <p data-at="15" data-out="27.5">Placed by the tags they share, memes that share tags sit together.</p>`,
      `<p data-at="28">Some share too few to be tied to any: ${fmt(F.alone)} of them.</p>
        <div class="facts">${quiet(33, CC.meme, fmt(F.memes), 'memes')}${quiet(34.5, GREY, fmt(F.alone), 'tied to none')}</div>
        ${note(38, `This is the authors' archive layout: each meme placed by the Jaccard similarity of its tags to every other's, with UMAP in 3D. Scraped from knowyourmeme.com in 2022 and 2023. No pictures, only names: the memes' pictures are Know Your Meme's, under copyright. ${fmt(F.flagged)} memes are not named here: they are ${FLAG_WORDS}.`)}
        <p class="credits" data-at="44">After the Menche lab's Memes_Data repository by Christiane Hütter.</p>`)}`,
    tied: `<h2 data-at="0.6">Tied by tags</h2>
      ${turns(`<p data-at="1.2" data-out="29.5">Tie two memes when they share tags, more strongly the more they share.</p>
        <p data-at="12" data-out="29.5" class="cyan">Now each meme moves to where its ties pull it.</p>`,
      `<p data-at="30">${fmt(F.linked)} memes form one network, with ${fmt(F.links)} ties.</p>
        <div class="facts">${quiet(36, CC.meme, fmt(F.linked), 'memes in the network')}${quiet(37.5, LINK, fmt(F.links), 'ties')}</div>
        ${note(42, `The authors' eigenvector layout of the tag network; each tie is weighted by the tags two memes share. We draw each meme's strongest few ties, ${fmt(F.kept)} in all.`)}`)}`,
    neighbourhoods: `<h2 data-at="0.6">Neighbourhoods</h2>
      ${turns(`<p data-at="1.2" data-out="34.5">Groups that tie mostly among themselves stand out.</p>
        <p data-at="9" data-out="34.5" class="amber">${esc(cap(listAnd(F.say)))}.</p>`,
      `<p data-at="35">Each has its own corner of the network, its own jokes and its own tags.</p>
        <div class="facts">${quiet(42, AMBER, fmt(F.coms), 'groups')}${quiet(43.5, GREY, fmt(F.tiny), 'of them tiny')}</div>
        ${note(48, `The groups are ours: Louvain community detection on the weighted ties. ${F.coms} groups, ${F.tiny} of them tiny; the ${F.named} others named by their most typical tags.`)}`)}`,
    year: `<h2 data-at="0.6">A year in memes</h2>
      ${turns(`<p data-at="1.2" data-out="25.5">Take one year at a time.</p>
        <p data-at="7" data-out="25.5" class="magenta">In ${F.scr.y}, the hot topic was television and streaming.</p>
        ${quiet(16, HOT, fmt(F.scr.tv), `memes tagged television, of the ${fmt(F.scr.n)} in the authors' ${F.scr.y} network`, 25.5)}`,
      `<p data-at="26" data-out="46.5" class="magenta">In ${F.pol.y}, it was politics, with the election and Trump.</p>
        ${quiet(36, HOT, fmt(F.pol.trump), `tagged trump, of the ${fmt(F.pol.n)} in the authors' ${F.pol.y} politics network`, 46.5)}`,
      `<p data-at="47" class="magenta">And on social media, TikTok, with ${fmt(F.soc.tiktok)} memes.</p>
        ${note(55, `The authors' annual networks: all the memes of one year in one of their topics, placed in 2D by their ties. We lift them into 3D: each hot topic's memes rise to a height of their own.`)}`)}`,
    niches: `<h2 data-at="0.6">Niches on the outside</h2>
      ${turns(`<p data-at="1.2" data-out="29.5">Back to the whole network. From outside, the cloud is a wall of niches.</p>
        <p data-at="12" data-out="29.5" class="cyan">Memes out here are tied tightly to their own: a median of ${F.outer.deg} ties each, and only ${pct(F.outer.foreign)} of them reach another group.</p>`,
      `<div class="facts">${quiet(30, SHELL, fmt(F.outer.deg), 'ties, the median out here')}${quiet(31.5, SHELL, pct(F.outer.foreign), 'of them to other groups')}</div>
        ${note(38, `The outer tenth of the memes by distance from the layout's centre, ${fmt(F.outer.n)} of them. ${F.shell.length ? `Among them, for example: ${esc(listAnd(F.shell.map(i => MD.name(i)).slice(0, 3)))}.` : ''}`)}`)}`,
    commons: `<h2 data-at="0.6">The commons inside</h2>
      ${turns(`<p data-at="1.2" data-out="35.5">Step inside, and it changes.</p>
        <p data-at="8" data-out="35.5" class="amber">At the centre sit the classics${ex.length ? ': ' + esc(listAnd(ex)) : ', the memes most of the web knows'}.</p>
        <p data-at="20" data-out="35.5">They have fewer ties, but ${shareWords(F.inner.foreign)} of them reach other groups.</p>`,
      `<p data-at="36" class="amber">From here, their ties run out to every wall.</p>
        <div class="facts">${quiet(44, GOLD, fmt(F.inner.deg), 'ties, the median in here')}${quiet(45.5, GOLD, pct(F.inner.foreign), 'of them to other groups')}</div>
        ${note(52, `The inner tenth against the outer tenth, ${fmt(F.innerN)} memes each. Seen from outside, about ${pct(F.hidIn)} of the commons is hidden behind other memes on average, and ${pct(F.hidSh)} of the shell.`)}`)}`,
    hypothesis: `<h2 data-at="0.6">A hypothesis</h2>
      ${turns(`<p data-at="1.2" data-out="27.5">Here is what standing in the middle suggests.</p>
        <p data-at="6" data-out="27.5" class="amber">A meme does not reach everyone by being seen most.</p>
        <p data-at="13" data-out="27.5">How central a meme is follows how far it crosses between groups, not its views or its year.</p>`,
      `<p data-at="28">Crossing may be what turns a niche joke into a shared classic.</p>
        <p data-at="35" class="cyan">A test: in a later archive, today's crossing memes should outlast the niche ones.</p>
        ${note(43, `Spearman's rho between how far in a meme sits and its share of ties to other groups: ${rho(F.rhoF)} (${rho(F.seedLo)} to ${rho(F.seedHi)} for other community splits); with its views ${rho(F.rhoV)}, its year ${rho(F.rhoY)}. A hypothesis from tag similarity: tags are editors' labels, not who shared what, and the layout is the authors'. A flat view still tells centre from edge (AUC ${num(F.auc, 2)}): standing inside helps you notice, it proves nothing.`)}
        <p data-at="48"><button class="btn primary" id="btnGoExplore" type="button">Explore the memes</button></p>
        <p class="credits" data-at="50">After the Menche lab's Memes_Data repository (github.com/menchelab/Memes_Data) by Christiane Hütter, and Know Your Meme. ${OURS} Narration: a synthetic voice.</p>`)}`,
  };

  const story = $('#story');
  story.innerHTML = CH.map(c => `<section class="ch" data-ch="${c.key}">${html[c.key]}</section>`).join('');
  CH.forEach(c => {
    const sec = story.querySelector(`[data-ch="${c.key}"]`);
    ST.items.push({ sec, ch: c, els: Array.from(sec.querySelectorAll('[data-at]')).map(el => ({
      el, at: c.a + K_T * parseFloat(el.dataset.at), out: el.dataset.out ? c.a + K_T * parseFloat(el.dataset.out) : c === CH[CH.length - 1] ? Infinity : c.b - 0.05, o: -1 })),
      grow: [] });
  });

  // ------------------------------------------------------------ timeline keys
  const wp = [];
  // a camera waypoint at time t: a set's named view, turned by spin degrees, optionally nudged
  const cam = (t, k, name, spin, ease, nudge) => {
    const v = view(k, name);
    v[0] += spin || 0;
    if (nudge) for (let i = 0; i < nudge.length; i++) v[i] += nudge[i] || 0;
    wp.push([t * K_T, ...v, ease, frameOf(k), narrowOf(k, name), fitShift(k, name), lowOf(k, name)]);
  };
  start({ cloud_grow: 0, cloud_layout: 0, cloud_alone: 0, cloud_links: 0, cloud_comCol: 0, cloud_shell: 0, cloud_commons: 0, cloud_cross: 0,
    cloud_core: 0, cloud_pulse: 0, cloud_pick: -1, cloud_com: -1, year_which: 1, year_fade: 1, year_rise: 0 });
  let a, b;
  // Every meme on file: the archive grows in; the memes tied to none dim
  a = C0.title.a; b = C0.title.b;
  show('cloud', 0.2, 2);
  ramp('cloud_grow', a + 1, a + 10, 0, 1);
  ramp('cloud_alone', a + 27.5, a + 31, 0, 1);
  cam(a, 'cloud', 'default', -60);
  cam(a + 10, 'cloud', 'default', -35);
  cam(b - 0.5, 'cloud', 'default', 10, 'spin');
  // Tied by tags: the tied memes move to the tag network's layout (the rest fade), their ties drawn
  a = C0.tied.a; b = C0.tied.b;
  ramp('cloud_alone', a + 1, a + 4, 1, 0);
  ramp('cloud_layout', a + 12, a + 26, 0, 1);
  ramp('cloud_links', a + 27, a + 33, 0, 1);
  cam(a + 1, 'cloud', 'default', 12);
  cam(a + 26, 'cloud', 'side', -20, 'spin');
  cam(b - 0.5, 'cloud', 'side', 10, 'spin');
  // Neighbourhoods: memes and ties take their community's colour, a slow turn
  a = C0.neighbourhoods.a; b = C0.neighbourhoods.b;
  ramp('cloud_comCol', a + 1, a + 6, 0, 1);
  cam(a + 1, 'cloud', 'default', 12);
  cam(b - 0.5, 'cloud', 'default', 75, 'spin');
  // A year in memes: the cloud goes, the snapshots one after another (screens 2019, politics 2020, social media 2020),
  // each one's hot topics rising out of its disc; then the cloud again
  a = C0.year.a; b = C0.year.b;
  hide('cloud', a + 0.5, a + 3);
  show('year', a + 2, a + 4.5, b - 3.5, b - 1);
  key('year_which', a, 1);
  ramp('year_rise', a + 8, a + 15, 0, 1);
  // (a jump: two keys at one time, so nothing eases from the one value to the other)
  const jump = (n, t, v0, v1) => { key(n, t, v0); key(n, t, v1); };
  ramp('year_fade', a + 24, a + 26, 1, 0); jump('year_which', a + 26, 1, 0); jump('year_rise', a + 26, 1, 0); ramp('year_fade', a + 26, a + 28, 0, 1);
  ramp('year_rise', a + 28.5, a + 35, 0, 1);
  ramp('year_fade', a + 45, a + 47, 1, 0); jump('year_which', a + 47, 0, 2); jump('year_rise', a + 47, 1, 0); ramp('year_fade', a + 47, a + 49, 0, 1);
  ramp('year_rise', a + 49.5, a + 56, 0, 1);
  show('cloud', b - 2, b);
  cam(a + 0.5, 'cloud', 'default', 75);
  cam(a + 3, 'year', 'default', -30);
  cam(a + 24, 'year', 'low', 10, 'spin');
  cam(a + 45, 'year', 'low', 40, 'spin');
  cam(b - 3, 'year', 'low', 70, 'spin');
  // Niches on the outside: the cloud again, the outer shell bright, close in to its wall
  a = C0.niches.a; b = C0.niches.b;
  ramp('cloud_comCol', a + 0.5, a + 4, 1, 0.35);
  ramp('cloud_shell', a + 5, a + 11, 0, 1);
  cam(a + 0.5, 'cloud', 'default', 10);
  cam(a + 13, 'cloud', 'close', 20);
  cam(b - 0.5, 'cloud', 'close', 50, 'spin');
  // The commons inside: in, the commons gold round you, its classics named, its ties out to every wall
  a = C0.commons.a; b = C0.commons.b;
  ramp('cloud_shell', a + 1, a + 5, 1, 0);
  ramp('cloud_commons', a + 4, a + 10, 0, 1);
  ramp('cloud_core', a + 8, a + 12, 0, 1);
  ramp('cloud_cross', a + 35, a + 42, 0, 1);
  cam(a + 1, 'cloud', 'close', 50);
  cam(a + 9, 'cloud', 'commons', 0);
  cam(b - 0.5, 'cloud', 'commons', 60, 'spin');
  // In a headset the commons and the hypothesis stand you inside the cloud (xrPlace: its middle at your eyes, the
  // commons about 1 m round you, the shell beyond as walls), and float it in front of you again at the story's end
  ST.stand.push([C0.commons.a + 4, C0.commons.a + 10, C0.hypothesis.b - 4, C0.hypothesis.b - 0.5].map(x => x * K_T));
  // A hypothesis: still inside, the crossroads' ties pulsing outward (cloud_pulse), a slow turn
  a = C0.hypothesis.a; b = C0.hypothesis.b;
  ramp('cloud_pulse', a + 5, a + 10, 0, 1);
  cam(a + 1, 'cloud', 'commons', 62);
  cam(b - 4, 'cloud', 'commons', 120, 'spin');
  cam(b - 0.5, 'cloud', 'default', 140);
  // ---- sound effects (sfxCue: story time, a sound, where it comes from, its options), beside the keys above: a cue just
  // before the line it goes with, textures under the voice soft (cued in authored seconds, as the keys)
  const cue = (t, ...r) => sfxCue(t * K_T, ...r);
  a = C0.title.a;
  cue(a + 0.8, 'grow', 'cloud', 'centre', { dur: 9 });                            // the archive grows in
  cue(a + 27.3, 'step', 'cloud', 'centre', { pitch: 0.8, gain: 0.4 });            // the memes tied to none dim
  a = C0.tied.a;
  cue(a + 11.8, 'whoosh', 'cloud', 'centre', { dur: 12 });                        // into the tag network's layout
  [27, 27.5, 28, 28.5, 29].forEach((s, i) => cue(a + s, 'link', 'cloud', 'centre', { pitch: Math.pow(2, 2 * i / 12), seq: true }));   // ties form
  a = C0.neighbourhoods.a;
  cue(a + 0.8, 'rise', 'cloud', 'top', { dur: 3, gain: 0.4 });                    // the groups' colours
  // (each snapshot's hot word as its tag point: hotN, the year set's anchors)
  const hotAt = (k, w) => 'hot' + Math.max(0, (MD.subs.find(s => s.key === k) || { hot: [] }).hot.indexOf(w));
  a = C0.year.a;
  cue(a + 0.3, 'whoosh', 'year', 'centre', { dur: 3 });                           // the cloud goes, the year comes
  cue(a + 7.8, 'rise', 'year', hotAt('screens', 'television'), { dur: 4 });                               // television rises
  cue(a + 25.8, 'whoosh', 'year', 'centre', { dur: 1.5, pitch: 1.2 });            // politics
  cue(a + 28.3, 'rise', 'year', hotAt('politics', 'trump'), { dur: 4 });
  cue(a + 46.8, 'whoosh', 'year', 'centre', { dur: 1.5, pitch: 1.3 });            // social media
  cue(a + 49.3, 'rise', 'year', hotAt('socialmedia', 'tiktok'), { dur: 4 });
  cue(C0.year.b - 2.2, 'whoosh', 'cloud', 'centre', { dur: 2, pitch: 0.8 });      // the cloud again
  a = C0.niches.a;
  cue(a + 4.8, 'step', 'cloud', 'shell', { pitch: 0.9 });                         // the shell lit
  cue(a + 12.6, 'whoosh', 'cloud', 'shell', { dur: 1.5 });                        // close to its wall
  a = C0.commons.a;
  cue(a + 3.8, 'rise', 'cloud', 'commons', { dur: 4 });                           // the commons gold
  cue(a + 8.8, 'whoosh', 'cloud', 'centre', { dur: 2, pitch: 0.8 });              // inside
  [7.8, 8.6, 9.4].forEach((s, i) => cue(a + s + 1.5, 'ping', 'cloud', 'commons', { pitch: Math.pow(2, 3 * i / 12), seq: true }));   // the classics
  cue(a + 34.8, 'pulse', 'cloud', 'commons');                                     // their ties run out
  a = C0.hypothesis.a;
  cue(a + 5.8, 'pulse', 'cloud', 'commons', { gain: 0.4 });                       // not by being seen most
  cue(a + 27.8, 'pulse', 'cloud', 'commons', { pitch: 1.2, gain: 0.4 });          // crossing
  cue(a + 34.8, 'ping', 'cloud', 'commons');                                      // a test
  for (const n in TR) TR[n].sort((x, y) => x[0] - y[0]);
  buildCamera(wp);
}
// camera waypoints: [t, az, el, dist, tx, ty, tz, ease, set, narrow factor, FIT's target shift, LOW]; 'spin' segments turn at
// a steady pace.
// When the story hands over from one set to another, the new set is turned about its
// vertical axis so that its first view starts where the camera already is: a crossfade
// never swings the camera round. The set keeps that turn while it is on show (setYaw).
// (the cloud and the year each turn on their own: they are never on show together for long)
function buildCamera(wp) {
  wp.sort((x, y) => x[0] - y[0]);
  const turn = (w, deg) => {
    const r = deg * D2R, x = w[4], z = w[6], f = w[10], fx = f[0], fz = f[2];
    w[1] += deg; w[4] = x * Math.cos(r) + z * Math.sin(r); w[6] = -x * Math.sin(r) + z * Math.cos(r);
    f[0] = fx * Math.cos(r) + fz * Math.sin(r); f[2] = -fx * Math.sin(r) + fz * Math.cos(r);   // (the shift turns with it)
  };
  ST.yaw = [];
  let cur = null, prevAz = null;
  for (const w of wp) {
    if (!cur || w[8] !== cur.k) {
      const d = prevAz === null ? 0 : ((prevAz - w[1]) % 360 + 540) % 360 - 180;
      cur = { k: w[8], t0: w[0], c: Math.abs(d) > 40 ? d : 0 };
      ST.yaw.push(cur);
    }
    turn(w, cur.c);
    prevAz = w[1];
  }
  // keep turning the short way round between views
  let prev = null;
  ST.wp = wp.map(w => {
    let az = w[1];
    if (prev !== null) az += 360 * Math.round((prev - az) / 360);
    prev = az;
    return [w[0], az, w[2], w[3], w[4], w[5], w[6], w[7], w[9] || 1, w[10], w[11]];
  });
}
// the turn a set has at story time t: that of its latest stay on show (it starts fading in a little before its first view)
function setYaw(k, t) {
  let c = 0;
  const f = frameOf(k);
  for (const y of ST.yaw) if (y.k === f && y.t0 - 6 <= t) c = y.c;
  return c;
}
// 0..1 progress over a segment of length D: smoothstep, or for 'spin' segments a steady
// slow turn with short eased starts and stops (trapezoidal speed profile)
const smoothSeg = (t, D) => smooth(t / D);
function spinEase(t, D) {
  const r = Math.min(2.5, D / 3);
  if (t <= 0) return 0;
  if (t >= D) return 1;
  const v = 1 / (D - r); // cruise speed so the ramps plus cruise cover 0..1
  if (t < r) return v * t * t / (2 * r);
  if (t > D - r) return 1 - v * (D - t) * (D - t) / (2 * r);
  return v * (t - r / 2);
}
// the story's view at time t: [az, el, dist, tx, ty, tz, narrow factor, FIT's target shift x, y, z, and LOW's two]
// (in a headset the sixth and seventh chapters stand you inside the cloud instead: standW and xrPlace)
const storyCam = t => storyView(t);
function storyView(t) {
  const wp = ST.wp, end = w => [w[1], w[2], w[3], w[4], w[5], w[6], w[8], ...w[9], ...w[10]];
  if (t <= wp[0][0]) return end(wp[0]);
  for (let i = 1; i < wp.length; i++) {
    if (t <= wp[i][0]) {
      const p = wp[i - 1], q = wp[i], x = q[0] > p[0] ? (q[7] === 'spin' ? spinEase : smoothSeg)(t - p[0], q[0] - p[0]) : 1, f = p[9], g = q[9], l = p[10], m = q[10];
      return [p[1] + (q[1] - p[1]) * x, p[2] + (q[2] - p[2]) * x, Math.exp(Math.log(p[3]) + (Math.log(q[3]) - Math.log(p[3])) * x),
        p[4] + (q[4] - p[4]) * x, p[5] + (q[5] - p[5]) * x, p[6] + (q[6] - p[6]) * x, p[8] + (q[8] - p[8]) * x,
        f[0] + (g[0] - f[0]) * x, f[1] + (g[1] - f[1]) * x, f[2] + (g[2] - f[2]) * x, l[0] + (m[0] - l[0]) * x, l[1] + (m[1] - l[1]) * x];
    }
  }
  return end(wp[wp.length - 1]);
}

// In a headset the commons and the hypothesis stand you inside the cloud (the topo story keys its tower the same way):
// its middle at your eyes, the commons about 1 m round you (the cloud set's `inside` view; xrPlace
// blends to that pose by this weight, XR.inW). The weight follows the story's time alone, so at a shared-room station
// everyone sees the same. On a screen nothing changes.
// ST.stand: [t0, t1, t2, t3], in over t0..t1 and out over t2..t3 (story time)
const standW = t => ST.stand.reduce((w, [t0, t1, t2, t3]) => Math.max(w, Math.min(smooth((t - t0) / (t1 - t0)), smooth((t3 - t) / (t3 - t2)))), 0);
// ---------------------------------------------------------------- labels --
// Story labels are pinned to a set's anchor for a stretch of story time; each
// set also brings its own labels, shown whenever its params call for them.
const LBL = { story: ST.labels, sets: [], extra: [] };
function labelEl(html, cls) {
  const el = document.createElement('div');
  el.className = 'lbl ' + (cls || '');
  el.innerHTML = html;
  el.style.opacity = 0;
  $('#labels').appendChild(el);
  return el;
}
function label(set, at, html, tIn, tOut, cls) {
  if (typeof at === 'string' && (GL.sets[set].labels || []).some(L => L.at === at)) return; // the set labels this point itself
  ST.labels.push({ kind: 'story', el: labelEl(html, cls), set, at, tIn, tOut, o: -1 });
}
// a label's rest after its bold part; a long one (more than a mark such as ' · hub' or ' · 1.2×') gives way on narrow
// screens (placeLabels)
const sfxSpan = r => (!r ? '' : String(r).length > 8 ? `<span class="sx">${esc(r)}</span>` : esc(r));
function buildSetLabels() {
  for (const k of SET_ORDER) for (const L of GL.sets[k].labels || []) {
    // (a label's text may be a function: it follows what the set shows, see labelText)
    const fn = typeof L.text === 'function' ? L.text : null, [b, r] = fn ? fn() : L.text;
    LBL.sets.push({ kind: 'set', el: labelEl(`<b>${esc(b)}</b>${sfxSpan(r)}`, L.cls), set: k, at: L.at, alpha: L.alpha, minor: !!L.minor, o: -1,
      fn, tx: fn ? b + '|' + r : '', none: !b && !r });
  }
}
// a label whose text is a function (the radius and its counts, a slide picked, a window's share, a cell's score) is read again
// while it shows and redrawn when it changes: the HTML label, and the headset's sprite (dropped, so it is made again)
function labelText(L) {
  if (!L.fn) return;
  const [b, r] = L.fn(), s = b + '|' + r;
  if (s === L.tx) return;
  L.tx = s; L.none = !b && !r;
  L.el.innerHTML = `<b>${esc(b)}</b>${sfxSpan(r)}`;
  L.w = 0; L.nar = undefined; dropSprite(L);
}
// a set label shows as far as its set is in and its own rule allows
// (labels a set marks as minor give way on narrow screens)
const setLabelAlpha = (L, S) => {
  const a = S[L.set + '_a'] || 0;
  if (a < 0.5 || (L.minor && !GL.wide && !XR.on)) return 0;
  const v = (2 * a - 1) * clamp(L.alpha ? L.alpha(S) : 1, 0, 1);
  if (v > 0) labelText(L);
  return L.none ? 0 : v;
};
// where a label points, in the world's own coordinates
const _v = new THREE.Vector3();
function labelPos(L, out) {
  const p = anchorOf(L.set, L.at);
  return out.set(p[0], p[1], p[2]).applyMatrix4(GL.sets[L.set].group.matrix);
}
// labels on screen: pinned next to their point, nudged down where they would overlap, and
// kept clear of the side panel, the timeline and the edge of the screen
const _placed = [];
function placeLabels(list, alphaOf) {
  _placed.length = 0;
  const vis = [], W = window.innerWidth, H = window.innerHeight;
  const pr = $('#panel').getBoundingClientRect(), barTop = $('#bar').getBoundingClientRect().top || H;
  for (const L of list) {
    let o = Math.round(alphaOf(L) * 100) / 100, x = 0, y = 0;
    if (o > 0) {
      labelPos(L, _v).applyMatrix4(GL.world.matrixWorld).project(GL.camera);
      if (_v.z > 1 || Math.abs(_v.x) > 1.2 || Math.abs(_v.y) > 1.2) o = 0;
    }
    if (o > 0) {
      // (on a narrow screen a label's long rest is left out: the panel says it, and the scene there is small)
      if (L.nar !== !GL.wide) { L.nar = !GL.wide; const sx = L.el.querySelector('.sx'); if (sx) sx.style.display = L.nar ? 'none' : ''; L.w = 0; }
      if (!L.w) { L.w = L.el.offsetWidth || 120; L.h = L.el.offsetHeight || 22; }
      const sx = (_v.x * 0.5 + 0.5) * W;
      x = sx + 9; y = (-_v.y * 0.5 + 0.5) * H - 11;
      if (pr.width && y + L.h > pr.top && y < pr.bottom && x < pr.right + 6) {
        // a point just beside the panel keeps its label next to the panel; one behind it shows none
        if (GL.wide && sx > pr.right - 40) x = pr.right + 6; else o = 0;
      }
      if (y + L.h > barTop - 4 || y < 50) o = 0;
      x = Math.max(6, Math.min(x, W - L.w - 6));
    }
    if (o !== L.o) { L.el.style.opacity = o; L.o = o; }
    if (o <= 0) continue;
    vis.push([L, x, y]);
  }
  vis.sort((p, q) => p[2] - q[2]);
  for (const [L, x, y0] of vis) {
    let y = y0;
    for (let pass = 0; pass < 6; pass++) {
      const hit = _placed.find(r => x < r[0] + r[2] && r[0] < x + L.w && y < r[1] + r[3] && r[1] < y + L.h);
      if (!hit) break;
      y = hit[1] + hit[3] + 2;
    }
    _placed.push([x, y, L.w, L.h]);
    L.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }
}

// ------------------------------------------------------------ panel update --
let curCh = null;
function updateStoryDOM(t) {
  const c = CH.find(c => t >= c.a && t < c.b) || CH[CH.length - 1];
  if (c !== curCh) {
    ST.items.forEach(it => it.sec.classList.toggle('on', it.ch === c));
    curCh = c;
    $('#panel').scrollTop = 0;
  }
  const it = ST.items.find(x => x.ch === c);
  let fresh = null;
  for (const e of it.els) {
    const o = Math.round(fadeVal(t, e.at, e.out, 0.6) * 100) / 100;
    if (o !== e.o) {
      if (e.o <= 0 && o > 0 && !e.el.classList.contains('credits')) fresh = e.el;
      e.el.style.opacity = o; e.o = o; e.el.style.visibility = o > 0 ? 'visible' : 'hidden';
    }
  }
  // on a short (phone) panel, scroll just far enough that a line that has just appeared is not below the fold
  if (fresh) {
    const p = $('#panel'), pr = p.getBoundingClientRect(), over = fresh.getBoundingClientRect().bottom - (pr.bottom - parseFloat(getComputedStyle(p).paddingBottom));
    if (over > 0) {
      // (a chapter's heading is shown whole or scrolled out of sight, never cut in half)
      const h = it.sec.querySelector('h1, h2'), hr = h && h.getBoundingClientRect(), edge = pr.top + p.clientTop + over;
      p.scrollTo({ top: p.scrollTop + over + (hr && hr.top < edge && hr.bottom > edge ? hr.bottom - edge + 4 : 0), behavior: 'smooth' });
    }
  }
  if (c.key === 'title') {
    const arc = $('#titleArc');
    if (arc) { arc.setAttribute('stroke-dashoffset', (1 - smooth((t - 0.5) / 2.2)).toFixed(3)); $('#titleDot').setAttribute('opacity', smooth((t - 2.5) / 0.4)); }
  }
}

// ------------------------------------------------------------- timeline UI --
function buildTimeline() {
  const tr = $('#track');
  tr.innerHTML = '<div class="rail"></div><div class="done"></div>' + CH.slice(1).map(c =>
    `<div class="tick" data-k="${c.key}" style="left:${(100 * c.na / T_END).toFixed(2)}%"></div><div class="name" data-k="${c.key}" style="left:${(100 * c.na / T_END).toFixed(2)}%">${c.name}</div>`).join('') + '<div class="knob"></div>';
  tr.setAttribute('aria-valuemax', Math.round(T_END));
  const seekAt = ev => {
    const r = tr.getBoundingClientRect();
    APP.seek(clamp((ev.clientX - r.left) / r.width, 0, 1) * T_END);
  };
  let drag = false;
  tr.addEventListener('pointerdown', ev => { drag = true; tr.setPointerCapture(ev.pointerId); seekAt(ev); });
  tr.addEventListener('pointermove', ev => { if (drag) seekAt(ev); });
  tr.addEventListener('pointerup', () => { drag = false; });
  tr.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowRight') { APP.seek(APP.t + 5); ev.preventDefault(); }
    if (ev.key === 'ArrowLeft') { APP.seek(APP.t - 5); ev.preventDefault(); }
  });
  $('#play').addEventListener('click', () => APP.togglePlay());
  // slideshow: Next and this story's switch, in the shell's row at the foot of the panel (an older shell has none)
  if ($('#slides')) { $('#btnNext').addEventListener('click', slideNext); $('#btnSlides').addEventListener('click', slideToggle); }
  if ($('#btnNextBar')) $('#btnNextBar').addEventListener('click', slideNext);   // Next beside Play (phones)
}
const ICON_PLAY = '<svg viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 16 16"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>';
let lastTick = -1;
function updateTimeline(t, playing) {
  const p = (100 * t / T_END).toFixed(2);
  if (p !== lastTick) {
    $('#track .done').style.width = p + '%';
    $('#track .knob').style.left = p + '%';
    $('#track').setAttribute('aria-valuenow', Math.round(t));
    const m = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    $('#clock').textContent = m(t) + ' / ' + m(T_END);
    const c = CH.find(c => t >= c.na && t < c.nb) || CH[CH.length - 1];
    document.querySelectorAll('#track .name').forEach(n => n.classList.toggle('cur', n.dataset.k === c.key));
    lastTick = p;
  }
  const want = playing ? 'pause' : 'play';
  const btn = $('#play');
  if (btn.dataset.s !== want) { btn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY; btn.dataset.s = want; btn.setAttribute('aria-label', playing ? 'Pause' : 'Play'); }
  slideDOM();
}
