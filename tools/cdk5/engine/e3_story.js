
// ================================================================== STORY ==
// Narration timing: [time in the recording, original story cue]. The story's
// animation is stretched or squeezed between these points so each cue lands on
// the matching sentence. A placeholder until the story is narrated (story time is
// the recording's time): node tools/voice/narrate.mjs cdk5 writes this table and
// NARRATION_ENDS from the recording it makes (each stretch lasts the longer of
// 1.1 times its story time and its line's audio plus a pause); run it again after
// the text changes (see tools/voice/README.md).
const NARRATION_SYNC = [
  [0, 0], [1.32, 1.2], [3.88, 2.4], [7.88, 5], [13.38, 10], [23.12, 17], [35.88, 28.6],
  [39.41, 29.5],                                      // Sixteen thousand proteins
  [61.41, 49.5], [62.71, 50.68], [64.97, 50.7], [96.65, 79.5], [103.96, 85.5], [106.31, 87],  // A kinase among its cousins
  [129.41, 108], [130.71, 109.18], [132.87, 109.2],   // Two partners switch it on
  [190.95, 162], [192.24, 163.18], [194.04, 163.2],   // Healthy signalling
  [257.07, 220.5], [258.37, 221.68], [260.26, 221.7],  // A cut that sticks
  [318.34, 274.5], [319.64, 275.68], [321.8, 275.7],  // Stuck on in Alzheimer's
  [384.83, 333], [386.13, 334.18], [388.32, 334.2],   // A landscape of diseases
  [456.3, 396], [457.6, 397.18], [459.46, 397.2], [507.64, 441],  // Too little, too much
];
// where each chapter's words end in the recording (seconds by chapter key): the slideshow lets the voice finish there
// (placeholders, a moment before each chapter's end, until the story is narrated)
const NARRATION_ENDS = { title: 50.25, kinase: 111.5, activators: 161.25, signal: 226.2, calpain: 292, alzheimer: 366.5, landscape: 450.2, learn: 486.55 };
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
// clock, so the narration, paced at least 1.1 times story time, comes to about 8 minutes)
const K_T = 0.9;
const CH0 = [
  { key: 'title', name: 'Sixteen thousand proteins', a: 0, b: 55 },
  { key: 'kinase', name: 'A kinase among its cousins', a: 55, b: 120 },
  { key: 'activators', name: 'Two partners switch it on', a: 120, b: 180 },
  { key: 'signal', name: 'Healthy signalling', a: 180, b: 245 },
  { key: 'calpain', name: 'A cut that sticks', a: 245, b: 305 },
  { key: 'alzheimer', name: 'Stuck on in Alzheimer\'s', a: 305, b: 370 },
  { key: 'landscape', name: 'A landscape of diseases', a: 370, b: 440 },
  { key: 'learn', name: 'Too little, too much', a: 440, b: 490 },
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
// their target moved (added to the set's own view, in story and explore mode alike). The close-ups of the centre stand
// a little further back (measured at 1280 x 760: p35 at the centre's left edge came under the panel)
const FIT = { net: { centre: [0, 0, 0.3, 0, 0, 0] }, core: { default: [0, 0, 0.3, 0, 0, 0], low: [0, 0, 0.3, 0, 0, 0] } };
// how much further back a view stands on a phone held upright (see narrowK): the whole map and the whole landscape
const NARROW = { net: { default: 1.15, side: 1.15, land: 1.2 } };
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
// Every number the story shows is the authors' (CDK5_DATA: their interactome, layouts and links) or the generator's
// documented counts (its over-representation tests), looked up through CDATA. Nothing scientific is computed here.
const CD = CDATA;
const pct = v => (Number.isFinite(+v) ? `${Math.round(100 * v)} %` : '–');
const word = n => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][n] || String(n);
const cap = s => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '');
const num = (v, d) => (v === null || v === undefined || !Number.isFinite(+v) ? '–' : (+v).toFixed(d));
const pTxt = p => (p === null || p === undefined || !Number.isFinite(+p) ? '' : p < 0.001 ? 'p < 0.001' : `p = ${(+p).toFixed(p < 0.01 ? 3 : 2)}`);
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const listAnd = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
// a protein's place on the map of processes, and the direction (degrees about the vertical) it is seen from
const sphereAt = i => { const L = CD.layout('bioproc'); return [L[3 * i], L[3 * i + 1], L[3 * i + 2]]; };
const azOf = p => Math.atan2(p[0], p[2]) / D2R;

// ------------------------------------------------------------------ facts --
// Numbers the story quotes, all from CDK5_DATA (SPEC.md, "The data")
const FACTS = (() => {
  const F = CD.facts, Dz = CD.diseases, T = n => CD.terms.find(t => t.name === n) || null;
  // a term CDK5's partners lean towards: only among the generator's most over-represented (partnerTop) with q under 0.05
  const top = n => Dz.partnerTop.find(t => t.name === n && t.q < 0.05) || null;
  // CDK5's cousins on the sphere: the CDKs that crowd round it (a few degrees; the next is far off), CDK1 elsewhere
  const fam = F.family.filter(f => f.i !== CD.cdk5).sort((a, b) => a.deg - b.deg), near = fam.filter(f => f.deg < 10);
  const T0 = { near: 0, n: 0 };
  return {
    proteins: F.proteins, links: F.links, withProcess: F.withProcess, without: F.proteins - F.withProcess, withDisease: F.withDisease,
    mapLinks: F.sceneLinks.bioproc, landLinks: F.sceneLinks.disease, ntrk2Links: F.sceneLinks.ntrk2, alzLinks: F.sceneLinks.alzheimer,
    deg: F.cdk5.deg, rank: F.cdk5.rank, hub: F.hub.sym, hubDeg: F.hub.deg,
    famNear: near.map(f => f.sym).sort((a, b) => parseInt(a.slice(3), 10) - parseInt(b.slice(3), 10)), famMax: Math.max(...near.map(f => f.deg)),
    cdk1: (fam.find(f => f.sym === 'CDK1') || { deg: 0 }).deg,
    p35: F.activators.p35, p39: F.activators.p39, ntrk2: F.pathways.ntrk2, alz: F.pathways.alzheimer,
    cdk5Terms: F.cdk5.terms, partnersDz: F.cdk5.partnersWithDisease, park: top('Parkinson\'s disease'), psych: top('psychotic disorder'),
    nearN: Dz.near.length, liss: T('lissencephaly') || T0, pch: T('pontocerebellar hypoplasia') || T0,
    // the map of processes' first knots, named from a current GO release (CDATA.clouds, CDATA.go; none without them)
    knots: (CD.clouds || []).slice(0, 3).map(c => c.name), goRel: CD.go && CD.go.release ? String(CD.go.release).replace(/^releases\//, '') : '',
    famMaxR: Math.ceil(Math.max(...near.map(f => f.deg))),   // (the net's tag rounds it up too)
    cancers: Dz.partnerTop.filter(t => t.q < 0.05 && /cancer|carcinoma|neoplasm/i.test(t.name)).length, topN: Dz.partnerTop.length, termsN: CD.terms.length,
  };
})();
// where the knots' names come from, wherever the knots show (chapter 1's small print, the credits, explore's scene)
const KNOT_NOTE = `The knots are named from today's Gene Ontology${FACTS.goRel ? ` (release ${FACTS.goRel})` : ''}, not the authors' own annotation; most of the map's big clouds mix many processes.`;
// the authors' own names of their six scenes (the CDK5_analytics project's folders), in the story's order
const AUTHOR_SC = ['00-BIOPROC', '01-CDK5-subunits', '02-CDK5active-Signalling_by_NTRK2', '03-CDK5p35-CALPAIN', '04-CDK5-hyperactive-alzheimers', '05-CDK5-hyperactive_diseaseInference'];
// the credits: the last chapter's small print and explore's About pane (page and headset)
const OURS = 'Ours: the close-ups at the map\'s centre (their balls, tubes and names, a clearer drawing of the centre\'s proteins at the authors\' places, scaled up), the tags with numbers and the over-representation counts.';
const ABOUT = `After ${CD.about}. The authors': the interactome of ${fmt(FACTS.proteins)} proteins and ${fmt(FACTS.links)} links, every layout, colour and link of the six scenes, the pathways' members (Reactome) and the proteins' Disease Ontology associations. ${OURS} The layouts place proteins with similar processes or diseases close only roughly (UMAP): distances on them are not measurements.`;
// colours as text on the HTML panel, which is light in the light theme: a colour mixed with the panel's ink (darker on
// a light panel, lighter on a dark one). The headset's panel is dark: its canvas twin takes the colour itself (data-col).
const inkCol = c => `color-mix(in srgb, ${c} 55%, var(--ink))`;
const swCol = c => c;   // a swatch or a bar in the same colour
// the story's colours (SPEC.md, "Look", CLOOK)
const CYAN = '#46d9ff', AMBER = '#ffb43b', RED = '#ff7a6b', GREEN = '#3ee08f', GREY = '#8e98ab';
const CC = CLOOK.C;

function buildStory() {
  const F = FACTS;
  // fade a set in over [t0, t1] and out over [t2, t3]
  const show = (k, t0, t1, t2, t3) => { ramp(k + '_a', t0, t1, 0, 1); if (t2 !== undefined) ramp(k + '_a', t2, t3, 1, 0); };
  const hide = (k, t0, t1) => ramp(k + '_a', t0, t1, 1, 0);
  // values a set starts the story with (keyed at time 0, so a set's resting defaults never leak into the story)
  const start = vals => { for (const n in vals) if (n in DEF) key(n, 0, vals[n]); };
  const step = (at, out, col, b, text) => `<li data-at="${at}"${out ? ` data-out="${out}"` : ''} data-col="${col}" style="border-left-color:${swCol(col)}"><b style="color:${inkCol(col)}">${esc(b)}</b>${text}</li>`;
  // a big number in a colour of its own (the headset's canvas reads data-col)
  const big = (col, v) => `<b data-col="${col}" style="color:${inkCol(col)}">${v}</b>`;
  // (out: where a part that takes turns with the next fades out)
  const fact = (at, col, v, small, out) => `<div data-at="${at}"${out ? ` data-out="${out}"` : ''}>${big(col, v)}<small>${small}</small></div>`;
  // ------------------------------------------------------------ panel copy
  // parts of a chapter that take turns in one place, each fading out (data-out) as the next comes: the headset's
  // panel cannot scroll, so no chapter shows more than fits at once
  const turns = (...parts) => `<div style="display:grid">${parts.map(p => `<div style="grid-area:1/1">${p}</div>`).join('')}</div>`;
  const n1 = v => (Math.round(v * 10) / 10).toFixed(1), deg = v => `${Math.round(v)}°`;
  const ACT = CC.activator, ALZ = CC.alz, HYP = CC.hyper;
  // small print the narration leaves out (data-say ""; it stays on the panels and in a headset)
  const note = (at, text, out) => `<p class="note" data-say="" data-at="${at}"${out ? ` data-out="${out}"` : ''}>${text}</p>`;
  const quiet = (at, col, v, small, out) => fact(at, col, v, small, out).replace('<div data-at', '<div data-say="" data-at');
  // the knots' short names (the net's tags), and where their names come from (shown wherever the knots are)
  const knots = F.knots.map(n => (api('net').knotName ? api('net').knotName(n) : n).toLowerCase());
  // the partners' terms that pass (FACTS: q under 0.05 among the most over-represented), named in the text only then
  const lean = [[F.park, 'Parkinson\'s disease', 'Parkinson\'s'], [F.psych, 'psychotic disorders', 'psychotic disorders']].filter(x => x[0]);
  const qTxt = t => (t.q < 0.001 ? 'q < 0.001' : `q = ${t.q.toFixed(3)}`);
  const html = {
    title: `<svg class="route-mark" viewBox="0 0 360 44" aria-hidden="true"><path id="titleArc" d="M8 36 Q180 -16 352 36" fill="none" stroke="var(--red)" stroke-width="2.2" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><circle cx="8" cy="36" r="4.5" fill="var(--red)"/><circle cx="352" cy="36" r="4.5" fill="var(--red)" id="titleDot" opacity="0"/></svg>
      <h1 data-at="1.2">The switch that sticks</h1>
      <p class="lede" data-at="2.4">CDK5, its network and brain diseases</p>
      ${turns(`<p data-at="5" data-out="27.5">A human cell runs on thousands of proteins.</p>
        <p data-at="10" data-out="27.5">Here are ${fmt(F.proteins)} of them. Proteins with similar jobs sit close together, and lines join those known to bind.</p>
        ${knots.length ? `<p data-at="17" data-out="27.5" class="amber">Where proteins share a job, they gather in knots: ${esc(listAnd(knots))}.</p>` : ''}`,
      `<div class="facts">${fact(28, GREEN, fmt(F.withProcess), 'with a known job, on the inner sphere')}${fact(29.5, GREY, fmt(F.without), 'with none known, on the outer shell')}</div>
        <p data-at="37" class="green">Somewhere among them is CDK5.</p>
        ${note(42, `This is the map of processes: each protein placed on a sphere by the Gene Ontology biological processes it takes part in, with the lab's cartoGRAPHs. The interactome joins proteins that bind with ${fmt(F.links)} links; the map shows only the ${fmt(F.mapLinks)} between near neighbours. Colours follow how many partners a protein has, from dark green to pale yellow for the most linked. ${KNOT_NOTE}`)}
        <p class="credits" data-at="45">After the Menche lab's CDK5_data repository by Christiane Hütter, and its CDK5_analytics VR scenes.</p>`)}`,
    kinase: `<h2 data-at="0.6">A kinase among its cousins</h2>
      ${turns(`<p data-at="1.2" data-out="29.5">CDK5 is a kinase: it switches other proteins on or off by adding phosphate to them.</p>
        <p data-at="9" data-out="29.5" class="green">On the map it sits among its cousins, kinases that drive cell division or switch genes on.</p>
        ${note(15, `CDK stands for cyclin-dependent kinase. CDK2, 4 and 6 drive cell division; CDK7, 8 and 9 mainly control how genes are read. ${listAnd(F.famNear)} sit within ${F.famMaxR} degrees of CDK5 on the sphere; CDK1 is ${Math.round(F.cdk1)} degrees away.`, 29.5)}`,
      `<p data-at="30">But CDK5 works in neurons, which no longer divide, and its partners are spread across the map.</p>
        <div class="facts">${fact(36, GREEN, fmt(F.deg), 'partners')}${fact(37.5, CYAN, ordinal(F.rank), `of ${fmt(F.proteins)} by partners`)}${quiet(46, AMBER, fmt(F.hubDeg), `for ${esc(F.hub)}, the most`)}</div>
        ${note(49, 'Partners are the proteins it is known to bind, its protein-protein interactions. Many proteins have only a few; the best studied have the most.')}`)}`,
    activators: `<h2 data-at="0.6">Two partners switch it on</h2>
      ${turns(`<p data-at="1.2" data-out="24.5">Its cousins are switched on by cyclins. CDK5 is not.</p>
        <p data-at="8" data-out="24.5" class="green">Two proteins found in neurons, p35 and p39, switch it on. On the map they live far apart.</p>
        <div class="facts">${quiet(14, ACT, deg(F.p35), 'from CDK5 to p35 on the sphere', 24.5)}${quiet(15.5, ACT, deg(F.p39), 'to p39, nearly opposite', 24.5)}</div>`,
      `<p data-at="25">Here they come together at the centre.</p>
        ${note(35, 'p35 is the protein CDK5R1 and p39 is CDK5R2. This is the authors\' scene of CDK5 and its regulatory subunits, with its two links bright green. The balls, tubes and names at the centre are our clearer drawing of the centre\'s proteins, at the authors\' places, scaled up.')}`)}`,
    signal: `<h2 data-at="0.6">Healthy signalling</h2>
      ${turns(`<p data-at="1.2" data-out="27.5">In a healthy neuron, the growth factor BDNF docks on its receptor, NTRK2.</p>
        <p data-at="12" data-out="27.5" class="cyan">A chain of proteins passes the message on, and CDK5 with p35 is one link.</p>`,
      `<p data-at="28">The neuron grows, survives and connects.</p>
        <div class="facts">${quiet(34, CYAN, fmt(F.ntrk2), 'proteins in the pathway')}${quiet(35.5, CYAN, fmt(F.ntrk2Links), 'links among them')}</div>
        ${note(40, 'This is Reactome\'s pathway Signalling by NTRK2, its proteins pulled into the centre with the links among them in the interactome; only these links show now. NTRK2 is also called TrkB. The message branches through the RAS proteins, PI3K and PLCG1, and CDK5 works with TIAM1 and RAC1 on the cell\'s skeleton. The faint ball is p39, left from the scene before.')}`)}`,
    calpain: `<h2 data-at="0.6">A cut that sticks</h2>
      ${turns(`<p data-at="1.2" data-out="22.5">Under stress, calcium floods into a neuron and wakes calpain, an enzyme that cuts proteins.</p>
        <p data-at="12" data-out="22.5" class="amber">Calpain cuts p35 into a shorter piece, p25.</p>`,
      `<p data-at="23" class="red">Bound to p25, CDK5 stays switched on for too long, and in the wrong places: it is hyperactive.</p>
        ${note(34, 'Calpain here is CAPN1 (Patrick and colleagues, Nature 1999; Lee and colleagues, Nature 2000). The link drawn between CDK5 and calpain is the authors\': calpain acts on p35, not on CDK5, and the interactome has no such link. The authors also left out every other link of CDK5 and of calpain in this scene. p25 has no point of its own in the interactome.')}`)}`,
    alzheimer: `<h2 data-at="0.6">Stuck on in Alzheimer's</h2>
      ${turns(`<p data-at="1.2" data-out="37.5">A switch stuck on does damage.</p>
        <p data-at="5" data-out="37.5">In Alzheimer's disease models, hyperactive CDK5 sets off harmful paths at once:</p>
        <ul class="steps">
          ${step(14, 37.5, ALZ, 'The cell cycle', 'CDC25A, B and C').replace('<li ', '<li data-say="the cell cycle," ')}
          ${step(17, 37.5, ALZ, 'The Golgi', 'GOLGA2').replace('<li ', '<li data-say="the Golgi," ')}
          ${step(20, 37.5, ALZ, 'The nuclear envelope', 'the lamins LMNA and LMNB1').replace('<li ', '<li data-say="the nuclear envelope," ')}
          ${step(23, 37.5, ALZ, 'Defences against oxidative stress', 'PRDX1, PRDX2 and SOD2').replace('<li ', '<li data-say="the defences against oxidative stress," ')}
          ${step(26, 37.5, ALZ, 'Signals for the cell\'s death', 'FOXO3, and its targets BCL2L11 and FASLG').replace('<li ', '<li data-say="and signals for the cell\'s death." ')}
        </ul>`,
      `<p data-at="38">Now the map is coloured by disease; grey proteins have none known.</p>
        <div class="facts">${quiet(44, ALZ, fmt(F.withDisease), 'proteins with a known disease')}${quiet(45.5, ALZ, fmt(F.alz), 'in the pathway')}${quiet(47, ALZ, fmt(F.alzLinks), 'links among them')}</div>
        ${note(50, 'The pathway is Reactome\'s "Deregulated CDK5 triggers multiple neurodegenerative pathways in Alzheimer\'s disease models", our reading of the name of the authors\' file. The diseases are those of the Disease Ontology. The faint ball is p39 again.')}`)}`,
    landscape: `<h2 data-at="0.6">A landscape of diseases</h2>
      ${turns(`<p data-at="1.2" data-out="29.5">Now place every protein by the diseases it is linked to.</p>
        <p data-at="16" data-out="29.5" class="amber">Proteins with a known disease gather in the middle; the rest are pushed to the walls.</p>`,
      `<p data-at="30" data-out="49.5">CDK5 lands among proteins tied to the same rare brain disorders: lissencephaly, a smooth brain, and pontocerebellar hypoplasia.</p>
        <div class="facts">${quiet(36, HYP, `${F.liss.near} of ${F.nearN}`, 'of its nearest share its lissencephaly', 49.5)}${quiet(38, HYP, `${F.pch.near} of ${F.nearN}`, 'its pontocerebellar hypoplasia', 49.5)}</div>
        ${note(41, `By construction: this layout places proteins with the same diseases together, so its nearest share them. In pontocerebellar hypoplasia the pons and the cerebellum stay small. CDK5's own Disease Ontology terms, ${F.cdk5Terms} with their parents, include lissencephaly, pontocerebellar hypoplasia, intellectual disability, schizophrenia and neurodegenerative disease.`, 49.5)}`,
      `<p data-at="50">${lean.length ? `Its partners lean towards the brain too: more of them than chance would give are linked to ${esc(listAnd(lean.map(x => x[1])))}.` : 'Its partners are spread over many diseases.'}</p>
        ${lean.length ? `<div class="facts">${lean.map(([t, , nm], k) => quiet(57 + 1.5 * k, CYAN, fmt(t.k), `${k ? 'with' : 'partners with'} ${esc(nm)}, about ${t.exp >= 10 ? Math.round(t.exp) : n1(t.exp)} expected`)).join('')}</div>` : ''}
        ${note(61, `The landscape places each protein by its Disease Ontology terms, their parents included (UMAP in 3D); its ${fmt(F.landLinks)} links join near proteins that interact. The counts are ours, over the ${fmt(F.withDisease)} proteins with any disease, ${F.partnersDz} of CDK5's ${F.deg} partners among them (a hypergeometric test, corrected for testing many terms${lean.length ? `: ${lean.map(([t, , nm]) => `${nm} ${qTxt(t)}`).join(', ')}` : ''}).${F.cancers ? ` Several cancers lean the same way (${F.cancers} of the ${F.topN} strongest terms).` : ''} Well-studied proteins have more known partners and diseases: in this map these are hints, not findings.`)}`)}`,
    learn: `<h2 data-at="0.6">Too little, too much</h2>
      ${turns(`<p data-at="1.2" data-out="21.5">CDK5 shows why a network view helps.</p>
        <p data-at="6" data-out="21.5">Too little CDK5, and the brain does not build itself properly.</p>
        <p data-at="13" data-out="21.5" class="red">Too much, stuck on by calpain's cut, and neurons are damaged.</p>`,
      `<p data-at="22">Explore the map yourself: any protein, any pathway, any disease.</p>
        <p data-at="25"><button class="btn primary" id="btnGoExplore" type="button">Explore the map</button></p>
        <p class="credits" data-at="27">After the Menche lab's CDK5_data repository (github.com/menchelab/CDK5_data) by Christiane Hütter, and its CDK5_analytics VR project, made with cartoGRAPHs; the interactome, Reactome's pathways, the Gene Ontology and the Disease Ontology as the authors used them. ${KNOT_NOTE}</p>
        <p class="credits" data-at="28">${OURS} Narration: a synthetic voice.</p>`)}`,
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
  // turns of the whole map's view that face a protein on the sphere (CDK5, APP), or the middle of CDK5 and its
  // activators (their homes are 99 and 172 degrees apart)
  const az0 = view('net', 'default')[0], toC = azOf(sphereAt(CD.cdk5)) - az0, toApp = azOf(sphereAt(Math.max(0, CD.find(F.hub)))) - az0;
  const mid = [CD.cdk5, CD.r1, CD.r2].map(sphereAt).reduce((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]), toMid = azOf(mid) - az0;
  start({ net_grow: 0, net_scene: 0, net_shell: 1, net_links: 1, net_cdk5: 0, net_hyper: 0, net_partners: 0, net_pick: -1, net_family: 0,
    net_homes: 0, net_clouds: 0, net_path: -1, net_term: -1, net_termA: 0, net_near: 0, net_veil: 0, net_core: 0, net_dim: 0, net_hub: 0, net_shells: 0,
    net_landTags: 0, core_scene: 0, core_names: 1, core_hyper: 0, core_cut: 0, core_flow: 0 });
  let a, b;
  // Sixteen thousand proteins: the map grows from its middle; its two shells named; CDK5 found, the view turned to it
  a = C0.title.a; b = C0.title.b;
  show('net', 0.2, 2);
  ramp('net_grow', a + 1, a + 9, 0, 1);
  ramp('net_clouds', a + 16, a + 19, 0, 1);   // (the knots where proteins share a job, named)
  ramp('net_clouds', a + 33, a + 36, 1, 0);
  ramp('net_shells', a + 26, a + 29, 0, 1);
  ramp('net_shells', a + 36, a + 38, 1, 0);
  ramp('net_cdk5', a + 37.5, a + 40, 0, 1);
  cam(a, 'net', 'default', toC - 70);
  cam(a + 9, 'net', 'default', toC - 45);
  cam(a + 26, 'net', 'default', toC - 20, 'spin');
  cam(a + 37, 'net', 'default', toC);
  cam(b - 0.5, 'net', 'default', toC + 8, 'spin');
  // In a headset the first two chapters stand you inside the map (xrPlace: the map's middle at your eyes, about 2.5 m
  // round you, CDK5's side in front), once it has grown, and float it in front of you again for the activators
  ST.stand.push([a + 7, a + 10, C0.kinase.b - 5, C0.kinase.b - 0.5].map(x => x * K_T));
  // A kinase among its cousins: close to CDK5, its family lit round it; then its 205 partners across the map; the hub
  a = C0.kinase.a; b = C0.kinase.b;
  ramp('net_family', a + 9, a + 12, 0, 1);
  ramp('net_family', a + 27, a + 30, 1, 0);
  ramp('net_partners', a + 31, a + 37, 0, 1);
  ramp('net_dim', a + 31, a + 35, 0, 0.55);
  ramp('net_hub', a + 45, a + 48, 0, 1);
  ramp('net_hub', b - 4, b - 1, 1, 0);
  ramp('net_partners', b - 3.5, b - 0.5, 1, 0);
  ramp('net_dim', b - 3.5, b - 0.5, 0.55, 0);
  cam(a + 1.5, 'net', 'cdk5', 0);
  cam(a + 26, 'net', 'cdk5', 12, 'spin');
  cam(a + 31, 'net', 'default', toC);
  cam(a + 48, 'net', 'default', toApp, 'spin');   // (the short way round to the hub, at a steady pace)
  cam(b - 0.5, 'net', 'default', toApp + 12, 'spin');
  // Two partners switch it on: p35's and p39's homes lit on the sphere; then the three pulled into the centre (scene 0
  // to 1), the core coming in with them and the sphere veiled in front of it
  a = C0.activators.a; b = C0.activators.b;
  ramp('net_homes', a + 8, a + 11, 0, 1);
  ramp('net_homes', a + 22, a + 25, 1, 0);
  ramp('net_scene', a + 25, a + 33, 0, 1); ramp('core_scene', a + 25, a + 33, 0, 1);
  show('core', a + 25, a + 27);
  ramp('net_core', a + 25, a + 31, 0, 1);
  ramp('net_veil', a + 28, a + 33, 0, 1);
  cam(a + 1, 'net', 'default', toMid, null, [0, 16, 0.3]);
  cam(a + 22, 'net', 'default', toMid + 18, 'spin', [0, 16, 0.3]);
  cam(a + 26, 'net', 'default', toC);
  cam(a + 33, 'net', 'centre', 0);
  cam(b - 0.5, 'net', 'centre', 25, 'spin');
  // Healthy signalling: the pathway's proteins pulled in (scene 1 to 2), the signal running out from BDNF
  a = C0.signal.a; b = C0.signal.b;
  ramp('net_scene', a + 3, a + 10, 1, 2); ramp('core_scene', a + 3, a + 10, 1, 2);
  ramp('core_flow', a + 14, a + 17, 0, 1);
  ramp('core_flow', b - 3, b - 0.5, 1, 0);
  cam(a + 1, 'net', 'centre', 30);
  cam(a + 12, 'core', 'low', -10);
  cam(a + 40, 'core', 'low', 25, 'spin');
  cam(b - 0.5, 'net', 'centre', 10);
  // A cut that sticks: calpain and CDK5 at the centre (scene 2 to 3); the link the authors drew flashes on; CDK5 turns red
  a = C0.calpain.a; b = C0.calpain.b;
  ramp('net_scene', a + 3, a + 10, 2, 3); ramp('core_scene', a + 3, a + 10, 2, 3);
  ramp('core_cut', a + 14, a + 19, 0, 1);
  ramp('net_hyper', a + 24, a + 30, 0, 1); ramp('core_hyper', a + 24, a + 30, 0, 1);
  cam(a + 1, 'net', 'centre', -10);
  cam(a + 12, 'core', 'default', -5);
  cam(b - 0.5, 'core', 'default', 30, 'spin');
  // Stuck on in Alzheimer's: the pathway's proteins pulled in (scene 3 to 4), the map recoloured by disease; the signal
  // runs out from CDK5 in orange; then back to see the map, the veil lifting
  a = C0.alzheimer.a; b = C0.alzheimer.b;
  ramp('net_scene', a + 3, a + 10, 3, 4); ramp('core_scene', a + 3, a + 10, 3, 4);
  ramp('core_flow', a + 14, a + 17, 0, 1);
  ramp('core_flow', a + 40, a + 43, 1, 0);
  ramp('net_veil', a + 41, a + 46, 1, 0);
  cam(a + 1, 'net', 'centre', -10);
  cam(a + 12, 'core', 'default', -10);
  cam(a + 38, 'core', 'default', 15, 'spin');
  cam(a + 45, 'net', 'default', toC);
  cam(b - 0.5, 'net', 'default', toC + 25, 'spin');
  // A landscape of diseases: the sphere opens into the landscape (scene 4 to 5), the core going; its two kinds named;
  // close to CDK5, its 30 nearest; then its partners across the landscape
  a = C0.landscape.a; b = C0.landscape.b;
  ramp('net_scene', a + 3, a + 15, 4, 5); ramp('core_scene', a + 3, a + 15, 4, 5);
  hide('core', a + 8, a + 13);
  ramp('net_core', a + 3, a + 12, 1, 0);
  ramp('net_landTags', a + 16, a + 19, 0, 1);
  ramp('net_landTags', a + 27, a + 30, 1, 0);
  ramp('net_near', a + 31, a + 35, 0, 1);
  ramp('net_dim', a + 31, a + 34, 0, 0.55);
  ramp('net_near', a + 47, a + 50, 1, 0);
  ramp('net_partners', a + 51, a + 57, 0, 1);
  cam(a + 1, 'net', 'default', toC);
  cam(a + 15, 'net', 'land', -20);
  cam(a + 27, 'net', 'land', 5, 'spin');
  cam(a + 31, 'net', 'landCdk5', 0);
  cam(a + 47, 'net', 'landCdk5', 20, 'spin');
  cam(a + 52, 'net', 'land', 10);
  cam(b - 0.5, 'net', 'land', 30, 'spin');
  // Too little, too much: the landscape, CDK5 glowing, a slow turn
  a = C0.learn.a; b = C0.learn.b;
  ramp('net_partners', a, a + 3, 1, 0);
  ramp('net_dim', a, a + 3, 0.55, 0);
  cam(a + 1, 'net', 'land', 32);
  cam(b - 0.5, 'net', 'land', 72, 'spin');
  // ---- sound effects (sfxCue: story time, a sound, where it comes from, its options), beside the keys above: a cue just
  // before the line it goes with, textures under the voice soft (cued in authored seconds, as the keys)
  const cue = (t, ...r) => sfxCue(t * K_T, ...r);
  a = C0.title.a;
  cue(a + 0.8, 'grow', 'net', 'centre', { dur: 8 });                              // the map grows from its middle
  cue(a + 37.3, 'ping', 'net', 'cdk5');                                           // CDK5 found
  a = C0.kinase.a;
  cue(a + 1, 'whoosh', 'net', 'cdk5', { dur: 1.5 });                              // close to CDK5
  cue(a + 8.8, 'ping', 'net', 'cdk5', { pitch: 1.2 });                            // its cousins lit
  [31, 31.5, 32, 32.5, 33].forEach((s, i) => cue(a + s, 'link', 'net', 'cdk5', { pitch: Math.pow(2, 2 * i / 12), seq: true }));   // its partners
  cue(a + 44.8, 'ping', 'net', 'app', { pitch: 0.8 });                            // the hub
  a = C0.activators.a;
  cue(a + 7.8, 'step', 'net', 'p35');                                             // p35's home
  cue(a + 8.4, 'step', 'net', 'p39', { pitch: 1.12 });                            // p39's
  cue(a + 24.8, 'whoosh', 'net', 'centre', { dur: 7 });                           // pulled into the centre
  cue(a + 31, 'link', 'core', 'cdk5', { seq: true });                             // their two links
  cue(a + 31.6, 'link', 'core', 'cdk5', { pitch: 1.12, seq: true });
  a = C0.signal.a;
  cue(a + 2.8, 'whoosh', 'net', 'centre', { dur: 6 });                            // the pathway pulled in
  cue(a + 13.8, 'pulse', 'core', 'bdnf');                                         // the signal
  cue(a + 28, 'pulse', 'core', 'ntrk2', { gain: 0.4 });
  a = C0.calpain.a;
  cue(a + 2.8, 'whoosh', 'net', 'centre', { dur: 6, pitch: 0.8 });                // the pathway goes, calpain comes
  cue(a + 14, 'snap', 'core', 'capn1');                                           // the cut
  cue(a + 14.5, 'spark', 'core', 'cdk5');
  cue(a + 24, 'knock', 'core', 'cdk5');                                           // CDK5 turns red
  a = C0.alzheimer.a;
  cue(a + 2.8, 'whoosh', 'net', 'centre', { dur: 6 });                            // the pathway pulled in
  cue(a + 13.8, 'pulse', 'core', 'cdk5', { pitch: 0.8 });                         // the harm spreads from CDK5
  [14, 17, 20, 23, 26].forEach((s, i) => cue(a + s - 0.3, 'step', 'core', 'app', { pitch: Math.pow(2, -2 * i / 12), gain: 0.4 }));   // its paths, one by one
  cue(a + 37.8, 'rise', 'net', 'top', { dur: 3 });                                // the map coloured by disease
  a = C0.landscape.a;
  cue(a + 2.8, 'whoosh', 'net', 'centre', { dur: 10, pitch: 0.7 });               // the sphere opens into the landscape
  cue(a + 12, 'rise', 'net', 'centre', { dur: 3 });
  cue(a + 30.8, 'ping', 'net', 'near');                                           // its 30 nearest
  [51, 51.5, 52, 52.5].forEach((s, i) => cue(a + s, 'link', 'net', 'cdk5', { pitch: Math.pow(2, 2 * i / 12), seq: true }));   // its partners
  a = C0.learn.a;
  cue(a + 0.5, 'rise', 'net', 'cdk5', { gain: 0.4 });                             // the landscape, CDK5 glowing
  cue(a + 12.8, 'knock', 'net', 'cdk5', { pitch: 0.8, gain: 0.4 });               // too much
  for (const n in TR) TR[n].sort((x, y) => x[0] - y[0]);
  buildCamera(wp);

  // --------------------------------------------------------- story labels
  // (the sets label their own parts; the story adds what the map's colours mean once they turn to disease)
  a = C0.alzheimer.a;
  label('net', 'top', '<b>Coloured by disease</b> · grey: none known', (a + 38) * K_T, (C0.alzheimer.b - 1) * K_T, 'amb');
}
// camera waypoints: [t, az, el, dist, tx, ty, tz, ease, set, narrow factor, FIT's target shift, LOW]; 'spin' segments turn at
// a steady pace.
// When the story hands over from one set to another, the new set is turned about its
// vertical axis so that its first view starts where the camera already is: a crossfade
// never swings the camera round. The set keeps that turn while it is on show (setYaw).
// (the net and the core share one frame, so the story never turns one against the other)
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
// (in a headset the first two chapters stand you inside the map instead: standW and xrPlace)
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

// In a headset the first two chapters stand you inside the map (the topo story keys its tower the same way): its
// middle at your eyes, the sphere about 2.5 m round you, CDK5's side in front (the net set's `inside` view; xrPlace
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
