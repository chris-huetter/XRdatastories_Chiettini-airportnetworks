// ================================================================ EXPLORE ==
// Explore mode: the cloud in either of the authors' layouts with its switches (Map), any named meme by searching or by
// pointing at it, with its ties and how much they cross (Memes), the 19 named communities (Communities), the three
// one-year snapshots (Years), and what is whose (About). Map, Memes and Communities show the cloud, Years the year set;
// About keeps whichever was on show. Every number shown is looked up in MEMES_DATA (through MDATA and the sets' api()):
// nothing is computed here but counts of the data's own marks.
const TABS = [['map', 'Map'], ['memes', 'Memes'], ['communities', 'Communities'], ['years', 'Years'], ['about', 'About']];
const sceneOfTab = k => (k === 'years' ? 'year' : k === 'about' ? null : 'cloud');
// the Map's switches (the engine's): ties, colours, what is lit; the Years' one: the hot topics risen or flat
const CT = {
  links: { key: 'links', label: 'Ties', options: [['on', 'On'], ['off', 'Off']] },
  colour: { key: 'colour', label: 'Colour', options: [['groups', 'By group'], ['plain', 'Plain']] },
  show: { key: 'show', label: 'Light up', options: [['none', 'Nothing'], ['shell', 'The niches'], ['commons', 'The commons'], ['alone', 'Tied to none']] },
  rise: { key: 'rise', label: 'Hot topics', options: [['up', 'Risen'], ['flat', 'Flat']] },
};
const CTLS = [CT.links, CT.colour, CT.show, CT.rise];
const LAYOUTS = [[0, 'Archive', 'every meme by tag similarity'], [1, 'Tag network', 'the memes tied by shared tags']];
// the panes' closing notes, the same on the page and in the headset
const NOTE = {
  map: `The archive places all ${fmt(FACTS.memes)} memes by the tags they share (the authors' UMAP of tag similarity); the tag network places the ${fmt(FACTS.linked)} tied ones by their ties (the authors' eigenvector layout). The niches: the outer tenth from the centre; the commons: the inner tenth. Colours: our ${FACTS.coms} groups.`,
  memes: `Ties: memes sharing tags, weighted by how many. "To other groups": its share of ties to memes of another of our groups. Views are Know Your Meme's, rounded. ${fmt(FACTS.flagged)} memes ${FLAG_WORDS} have no name here and cannot be searched.`,
  coms: `The groups are ours (Louvain on the weighted ties); their names our reading of their most typical tags. "In the commons": its memes among the inner tenth of the tag network; "on the shell": among the outer tenth.`,
  years: 'The authors\' annual networks: one year of one topic, placed in 2D by their ties; the hot topics are the authors\' marks. We lift them into 3D: each hot word\'s memes rise to a height of their own.',
};
// (explore opens on the tag network, coloured by group, the commons lit)
const X = { tab: 'map', layout: 1, scene: 'cloud', t0: 0, turn: 'on', inside: false, ctl: {}, meme: -1, com: -1, which: 0, q: '' };
const XS = {};
// params that pick something by number jump to their new value instead of easing through the ones in between
const STEP = new Set(['cloud_pick', 'cloud_com', 'year_which']);
const orbit = { cur: [0, 12, 3.6, 0, 0, 0], from: null, to: null, t0: 0, dur: 1.6 };
const ctlValue = c => (X.ctl[c.key] !== undefined ? X.ctl[c.key] : c.options[0][0]);
const ctlv = key => { const c = CT[key]; return c ? ctlValue(c) : ''; };
// the camera the scene on show opens on, or standing inside the cloud
const sceneCam = () => (X.scene === 'year' ? 'default' : X.inside ? 'inside' : 'default');
// what the sets know (their api()): picking, places, the eye
const API = {};
const api = k => API[k] || (API[k] = (GL.sets[k] && GL.sets[k].api ? GL.sets[k].api() : null) || {});
// work for the next frame, once the sets have drawn what was just picked
const NEXT = [];
// quick picks (Memes): the commons' classics and some of the shell's niches (named memes from the data's lists)
const QUICK = FACTS.core.slice(0, 4).concat(FACTS.shell.slice(0, 3));
const netOfMeme = i => (i >= 0 ? MD.netOf(i) : -1);

// what the chosen scene, its switches and the panes' picks ask for
function exploreTargets() {
  const cloud = X.scene !== 'year', L = X.layout, show = ctlv('show'), k = netOfMeme(X.meme);
  const tg = Object.assign({}, GL.sets.cloud.params, GL.sets.year.params, {
    cloud_a: cloud ? 1 : 0, year_a: cloud ? 0 : 1, cloud_grow: 1, cloud_layout: L,
    cloud_alone: L === 0 && show === 'alone' ? 1 : 0, cloud_links: ctlv('links') === 'on' ? 1 : 0, cloud_comCol: ctlv('colour') === 'groups' ? 1 : 0,
    cloud_shell: L === 1 && show === 'shell' ? 1 : 0, cloud_commons: L === 1 && show === 'commons' ? 1 : 0, cloud_cross: L === 1 && show === 'commons' ? 1 : 0,
    cloud_core: L === 1 && show === 'commons' && k < 0 && X.com < 0 ? 1 : 0, cloud_pick: k, cloud_com: X.com,
    year_which: X.which, year_fade: 1, year_rise: ctlv('rise') === 'flat' ? 0 : 1,
  });
  const out = {};
  for (const n in DEF) out[n] = n in tg ? tg[n] : n.endsWith('_a') ? 0 : XS[n];
  return out;
}
function exploreStep(dt) {
  const tg = exploreTargets(), k = 1 - Math.exp(-dt * 3.5);
  for (const n in DEF) XS[n] = STEP.has(n) ? tg[n] : LOG.has(n) ? logMix(XS[n], tg[n], k) : XS[n] + (tg[n] - XS[n]) * k;
  // a gently swaying scene, unless you are steering it or a set asks for stillness
  if (X.turn === 'on' && !orbit.to && !orbit.held && !GL.still && !HOST.room.placing()) { X.sway = (X.sway || 0) + dt; orbit.cur[0] += dt * 6 * Math.cos(X.sway * 0.25); }
  return XS;
}
// what the panes pick reaches the sets through their params (exploreTargets)
function pushState() { updateExtraLabels(); }
// the scene on show ('cloud' or 'year'), from the tab
function setScene(k, fly = true) {
  if (!k || k === X.scene) return;
  X.scene = k;
  if (k === 'year' && X.inside) X.inside = false;
  if (fly) { flyTo(view(k, sceneCam())); sfxAct('whoosh', k, 'centre', { dur: 0.8 }); }
}
function setLayout(v, ui = true) {
  v = v ? 1 : 0;
  if (v === X.layout) return;
  sfxAct('whoosh', 'cloud', 'centre', { dur: 1.2, pitch: v ? 1 : 0.8 });
  X.layout = v; X.t0 = performance.now();
  if (!v && X.inside) setInside(false, ui);
  renderAll();
}
function setCtl(key, v) {
  const c = CT[key];
  if (!c || !c.options.some(o => o[0] === v)) return;
  if (ctlValue(c) !== v) ctlSound(key, v);
  X.ctl[key] = v;
  X.t0 = performance.now();
  renderAll();
}
// (sound effects: a switch: ties snap on or off, a group lit, the hot topics rise or settle)
function ctlSound(key, v) {
  if (key === 'links') sfxAct(v === 'on' ? 'link' : 'snap', 'cloud', 'centre');
  else if (key === 'rise') sfxAct(v === 'up' ? 'rise' : 'step', 'year', 'top', { dur: 2 });
  else if (key === 'show') sfxAct(v === 'none' ? 'step' : 'ping', 'cloud', v === 'shell' ? 'shell' : 'commons');
  else sfxAct('step', 'cloud', 'centre', { pitch: 1.1 });
}
function flyTo(v) {
  const c = orbit.cur;
  orbit.from = c.slice();
  orbit.to = v.slice();
  orbit.to[0] = v[0] + 360 * Math.round((c[0] - v[0]) / 360);
  orbit.t0 = performance.now(); orbit.fast = false;
}
function orbitStep(now) {
  if (!orbit.to) return;
  const x = smooth((now - orbit.t0) / ((orbit.fast ? 0.25 : orbit.dur) * 1000)), f = orbit.from, t = orbit.to;   // fast: a view from the room
  orbit.cur = f.map((v, k) => (k === 2 ? Math.exp(Math.log(v) + (Math.log(t[k]) - Math.log(v)) * x) : v + (t[k] - v) * x));
  if (x >= 1) { orbit.to = null; orbit.fast = false; }
}
// fly to look at a meme: in the cloud from outside, over its own place (not while standing inside); in a snapshot, close
function flyToMeme(i) {
  if (X.inside || i < 0) return;
  if (X.scene === 'year') {
    const p = api('year').pos ? api('year').pos(i) : null;
    if (p) flyTo([orbit.cur[0], Math.max(orbit.cur[1], 20), Math.min(orbit.cur[2], 2.2), p[0], p[1], p[2]]);
    return;
  }
  const k = netOfMeme(i), A = api('cloud');
  if (k < 0 || !A.pos || X.layout !== 1) return;
  const p = A.pos(k), r = Math.hypot(p[0], p[1], p[2]);
  if (r > 1e-6) flyTo([Math.atan2(p[0], p[2]) / D2R, clamp(Math.asin(clamp(p[1] / r, -1, 1)) / D2R, -60, 60), Math.max(1.6, r + 1.2), p[0] / 2, p[1] / 2, p[2] / 2]);
}
// Stand inside: the camera at the cloud's middle, the commons round you (in a headset the cloud about 3 m a unit round
// you). Only in the tag network: the archive has no middle of its own
const INSIDE_OK = () => X.scene === 'cloud' && X.layout === 1;
function setInside(on, ui = true) {
  on = !!on && INSIDE_OK();
  if (on !== X.inside) sfxAct('whoosh', 'cloud', 'centre', { dur: 1, pitch: on ? 0.8 : 1.2 });
  X.inside = on;
  if (ui) flyTo(view('cloud', sceneCam()));
  renderAll();
}

// --------------------------------------------------------------- actions --
// Each setter changes its own field only when called with ui false (a shared room's state arriving); picked by
// hand (ui true) it also flies to what it shows.
// a meme (an archive index; -1 none): only named ones (the flagged and the unnamed are never picked or shown)
function selectMeme(i, ui = true) {
  const was = X.meme;
  X.meme = Number.isInteger(i) && i >= 0 && i < MD.n && MD.name(i) ? i : -1;
  if (X.meme >= 0 && X.meme !== was) sfxAct('pick', X.scene === 'year' ? 'year' : 'cloud', X.scene === 'year' ? 'centre' : 'pick');   // (sound effects: a meme picked)
  if (ui && X.meme >= 0) NEXT.push(() => { if (X.meme >= 0) flyToMeme(X.meme); });
  renderAll();
}
// a community (-1 none): lit, the rest dim
function selectCom(k, ui = true) {
  const was = X.com;
  X.com = Number.isInteger(k) && k >= 0 && k < MD.coms.length ? k : -1;
  if (X.com >= 0 && X.com !== was) sfxAct('ping', 'cloud', 'centre');   // (sound effects: a group lit)
  if (ui && X.com >= 0 && X.layout === 1 && !X.inside) {
    const c = MD.coms[X.com].centre, r = Math.hypot(c[0], c[1], c[2]);
    if (r > 1e-6) flyTo([Math.atan2(c[0], c[2]) / D2R, clamp(Math.asin(clamp(c[1] / r, -1, 1)) / D2R, -50, 50), 3.2, c[0] / 2, c[1] / 2, c[2] / 2]);
  }
  renderAll();
}
// a snapshot (0 politics, 1 screens, 2 social media): it fades in afresh
function setWhich(w, ui = true) {
  const v = clamp(Math.round(+w) || 0, 0, MD.subs.length - 1);
  if (v === X.which) return;
  X.which = v; XS.year_fade = 0;
  if (ui) sfxAct('whoosh', 'year', 'centre', { dur: 1, pitch: 1.1 });
  renderAll();
}
// a meme found in the cloud: the Memes tab, the tag network
function memeInCloud(i) {
  if (i < 0) return;
  if (X.tab !== 'memes') showTab('memes');
  if (netOfMeme(i) >= 0 && X.layout !== 1) setLayout(1);
  selectMeme(i);
}
// the search (Memes): the named memes matching what is typed, most viewed first (the page's own field; a headset types
// on the shell's keypad); never shared
const searchOf = q => MD.search(q, 10);
async function xrSearch() {
  if (!(HOST.collab && HOST.collab.keypad)) return;
  let q = null;
  try { q = await HOST.collab.keypad({ title: 'Search a meme', hint: 'Part of its name, such as doge or nyan', value: X.q, max: 24 }); } catch (e) { q = null; }
  if (q === null || q === undefined) return;
  X.q = String(q).trim();
  const r = searchOf(X.q);
  if (r.length && MD.name(r[0]).toUpperCase() === X.q.toUpperCase()) selectMeme(r[0]);
  renderAll();
}

// ------------------------------------------------------- shared rooms --
// What everyone at a station sees alike in explore mode: the tab, the layout, the switches, the meme picked, the
// community picked and the snapshot. The camera (and standing inside) and the search text are each person's own.
// shared rooms: the scene's view in a headset at a station (explore mode), which turns and sizes it in the room:
// shared (HOST.collab), so everyone there sees it alike; null while it flies somewhere (a pick, a view arriving)
function collabView() {
  if (APP.mode !== 'explore' || orbit.to || X.inside || XR.inW > 0.01) return null;   // (standing inside is this device's own)
  const c = orbit.cur, r = (x, k) => Math.round(x * k) / k;
  return [r((((c[0] + 180) % 360) + 360) % 360 - 180, 10), r(c[1], 10), r(c[2], 100), r(c[3], 100), r(c[4], 100), r(c[5], 100)];
}
function collabSetView(v, now) {
  if (APP.mode !== 'explore' || !Array.isArray(v) || v.length !== 6 || !v.every(Number.isFinite)) return;
  const c = orbit.cur, to = v.slice();
  to[0] += 360 * Math.round((c[0] - to[0]) / 360);
  if (now) { orbit.cur = to; orbit.to = null; return; }   // someone else turning it: there at once (shared.js smooths it)
  Object.assign(orbit, { from: c.slice(), to, t0: performance.now(), fast: true });   // a short glide there
}
function collabState() {
  const ctl = Object.fromEntries(CTLS.map(c => [c.key, ctlValue(c)]));
  return { tab: X.tab, layout: X.layout, ctl, meme: X.meme, com: X.com, which: X.which };
}
// show another person's state with the story's own setters (so both panels follow); every field is checked, and
// the camera stays where this person has it
function collabApply(v) {
  if (!v || typeof v !== 'object') return;
  if (TABS.some(t => t[0] === v.tab) && v.tab !== X.tab) { showTab(v.tab); setScene(sceneOfTab(v.tab), false); }
  if ((v.layout === 0 || v.layout === 1) && v.layout !== X.layout) setLayout(v.layout, false);
  for (const c of CTLS) {
    const x = v.ctl && v.ctl[c.key];
    if (c.options.some(o => o[0] === x) && ctlValue(c) !== x) setCtl(c.key, x);
  }
  const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
  if (int(v.meme, -1, MD.n - 1) && v.meme !== X.meme && (v.meme < 0 || MD.name(v.meme))) selectMeme(v.meme, false);
  if (int(v.com, -1, MD.coms.length - 1) && v.com !== X.com) selectCom(v.com, false);
  if (int(v.which, 0, MD.subs.length - 1) && v.which !== X.which) setWhich(v.which, false);
  renderAll();
}

// ------------------------------------------------------------------ panes --
// (a lit chip as the shell's primary button: its text in the panel's colour, readable in either theme)
const chip = (attrs, label, on, col) => `<button type="button" ${attrs} aria-pressed="${!!on}"${on ? ' style="background:var(--cyan);color:var(--panel-solid)"' : ''}>${col ? `<span class="sw" style="background:${swCol(col)}"></span>` : ''}${label}</button>`;
const statsHtml = rows => `<dl class="stats">${rows.map(([k, v, more]) => `<dt>${esc(k)}</dt><dd>${esc(v)}${more ? `<small>${esc(more)}</small>` : ''}</dd>`).join('')}</dl>`;
function buildExplore() {
  $('#explore').innerHTML = `
    <div class="tabs" role="tablist">${TABS.map(([k, n]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${k === X.tab}">${n}</button>`).join('')}</div>
    ${TABS.map(([k]) => `<div class="pane" id="pane-${k}" role="tabpanel"></div>`).join('')}`;
  // the Memes pane's search field is built once (a redraw must not take the text being typed), its picks below it
  $('#pane-memes').innerHTML = `<p class="sub">Search a meme by its name, or click one in the cloud (or point at it and pull the trigger).</p>
    <div class="search"><input id="memq" type="search" placeholder="Part of a name, such as doge or nyan" autocomplete="off" spellcheck="false" aria-label="Search memes" role="combobox" aria-expanded="false" aria-controls="memqs"><ul class="sugg" id="memqs" role="listbox"></ul></div>
    <div id="memePane"></div>`;
  document.querySelectorAll('#explore .tabs button').forEach(b => b.addEventListener('click', () => pickTab(b.dataset.tab)));
  // one click handler per pane: buttons carry what they do in data attributes
  $('#explore').addEventListener('click', ev => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const v = b.dataset.v;
    ({
      layout: () => setLayout(+v), ctl: () => setCtl(b.dataset.ctl, v), inside: () => setInside(!X.inside),
      meme: () => selectMeme(v === 'none' ? -1 : +v), com: () => selectCom(v === 'none' ? -1 : +v), which: () => setWhich(+v),
      incloud: () => memeInCloud(+v), comcloud: () => { pickTab('communities'); selectCom(+v); },
    }[b.dataset.act] || (() => {}))();
  });
  // the search: matches as you type, Enter takes the first (or the one chosen with the arrows)
  const q = $('#memq'), sg = $('#memqs');
  let hits = [], sel = 0;
  const list = () => {
    hits = searchOf(q.value); sel = 0;
    sg.innerHTML = hits.map((i, k) => `<li role="option" data-i="${i}" aria-selected="${k === sel}"><b>${esc(MD.name(i))}</b><span>${MD.year(i) || ''}</span><em>${netOfMeme(i) >= 0 ? fmt(MD.deg(netOfMeme(i))) + ' ties' : 'no ties'}</em></li>`).join('');
    sg.classList.toggle('on', hits.length > 0 && !!q.value.trim()); q.setAttribute('aria-expanded', sg.classList.contains('on'));
  };
  const take = i => { if (i === undefined || i < 0) return; q.value = MD.name(i); sg.classList.remove('on'); q.setAttribute('aria-expanded', 'false'); selectMeme(i); };
  q.addEventListener('input', list);
  q.addEventListener('focus', () => { if (q.value.trim()) list(); });
  q.addEventListener('blur', () => setTimeout(() => sg.classList.remove('on'), 150));
  q.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { take(hits[sel]); ev.preventDefault(); }
    else if ((ev.key === 'ArrowDown' || ev.key === 'ArrowUp') && hits.length) {
      sel = (sel + (ev.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length;
      sg.querySelectorAll('li').forEach((li, k) => li.setAttribute('aria-selected', k === sel));
      ev.preventDefault();
    } else if (ev.key === 'Escape') sg.classList.remove('on');
  });
  sg.addEventListener('mousedown', ev => { const li = ev.target.closest('li'); if (li) { ev.preventDefault(); take(+li.dataset.i); } });
  renderAll();
  $('#viewctl').innerHTML = `<div class="grp"><span>Turn</span><div class="seg" data-ctl="turn" role="group" aria-label="Turn">${[['on', 'On'], ['off', 'Off']].map(([v, n]) => `<button type="button" data-v="${v}" aria-pressed="${X.turn === v}">${n}</button>`).join('')}</div></div>`;
  $('#viewctl').addEventListener('click', ev => {
    const b = ev.target.closest('[data-v]'), seg = b && b.closest('[data-ctl]');
    if (seg && seg.dataset.ctl === 'turn') setTurn(b.dataset.v);
  });
  showTab(X.tab);
}
function setTurn(v) {
  X.turn = v;
  document.querySelectorAll('[data-ctl="turn"] button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v));
}
function showTab(k) {
  X.tab = k;
  document.querySelectorAll('#explore .tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === k));
  // (a phone's panel may not hold every tab: the row scrolls so the chosen one shows)
  const tb = $('#explore .tabs'), on = tb && tb.querySelector(`[data-tab="${k}"]`);
  if (on) { const r = on.getBoundingClientRect(), q = tb.getBoundingClientRect(); if (r.width && (r.left < q.left || r.right > q.right)) tb.scrollLeft += r.left - q.left - 8; }
  document.querySelectorAll('#explore .pane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + k));
  updateExtraLabels();
}
// a tab picked by hand: its scene brought up (the Years the snapshots, the others the cloud; About keeps what shows)
function pickTab(k) { showTab(k); setScene(sceneOfTab(k)); renderAll(); }
function renderAll() { renderMap(); renderMemes(); renderComs(); renderYears(); renderAbout(); updateExtraLabels(); }

// ------------------------------------------------------------------- map --
function renderMap() {
  const pane = $('#pane-map');
  if (!pane) return;
  const lay = LAYOUTS[X.layout];
  pane.innerHTML = `<div class="chips">${LAYOUTS.map(([v, n]) => chip(`data-act="layout" data-v="${v}"`, esc(n), X.layout === v)).join('')}</div>
    <p class="sub">${esc(cap(lay[2]))}: ${X.layout ? `${fmt(FACTS.linked)} memes, ${fmt(FACTS.links)} ties` : `${fmt(FACTS.memes)} memes, ${fmt(FACTS.alone)} of them tied to none`}.</p>
    ${CTLS.filter(c => c.key !== 'rise').map(c => `<p class="grp-h">${esc(c.label)}</p><div class="chips">${c.options.filter(([v]) => X.layout ? v !== 'alone' : v === 'none' || v === 'alone').map(([v, n]) => chip(`data-act="ctl" data-ctl="${c.key}" data-v="${v}"`, esc(n), ctlValue(c) === v, v === 'shell' ? CC.shell : v === 'commons' ? CC.commons : v === 'alone' ? CC.alone : null)).join('')}</div>`).join('')}
    ${INSIDE_OK() ? `<div class="chips" style="margin-top:12px">${chip('data-act="inside"', 'Stand inside', X.inside)}</div>` : ''}
    <p class="note">${esc(NOTE.map)}</p>`;
}

// ----------------------------------------------------------------- memes --
const BAND = ['in the commons (the inner tenth)', 'near the middle (the inner quarter)', 'between', 'out in the niches (the outer quarter)', 'on the outer shell (the outer tenth)'];
// a meme in words (both panels): its year, views, tags, group, ties and their share to other groups, how far in, its
// strongest named ties
function memeInfo(i) {
  if (i < 0 || !MD.name(i)) return null;
  const k = netOfMeme(i), y = MD.year(i), rows = [['Year', y ? String(y) : 'not known'], ['Views', fmt(MD.views(i)), 'on Know Your Meme, about']];
  if (k < 0) return { head: MD.name(i), i, k, rows: rows.concat([['Tag network', 'not in it'], ['In the archive', MD.alone && MD.alone(i) ? 'tied to none' : 'tied to some', MD.alone && MD.alone(i) ? 'too few tags shared' : '']]), tags: [], ties: [] };
  const nb = Array.from(MD.nb(k)), w = MD.w(k), ord = nb.map((j, n) => [j, w[n]]).sort((a, b) => b[1] - a[1]).map(x => x[0]).filter(j => MD.name(MD.eig(j)));
  rows.push(['Group', comName(MD.com(k))], ['Ties', fmt(MD.deg(k)), `${pct(MD.foreign(k))} to other groups`], ['Where', BAND[MD.band(k)]]);
  return { head: MD.name(i), i, k, rows, tags: MD.tags(k), ties: ord.slice(0, 8).map(j => MD.eig(j)) };
}
function renderMemes() {
  const el = $('#memePane');
  if (!el) return;
  const I = memeInfo(X.meme);
  el.innerHTML = `<div class="chips">${QUICK.map(i => chip(`data-act="meme" data-v="${i}"`, esc(MD.name(i)), X.meme === i, FACTS.core.includes(i) ? CC.commons : CC.shell)).join('')}</div>
    ${I ? `<h3 style="color:${inkCol(CC.pick)}">${esc(I.head)}</h3>${statsHtml(I.rows)}
      ${I.tags.length ? `<p class="grp-h">Tags</p><p class="sub">${esc(I.tags.join(', '))}</p>` : ''}
      ${I.ties.length ? `<p class="grp-h">Its strongest ties</p><div class="chips">${I.ties.map(j => chip(`data-act="meme" data-v="${j}"`, esc(MD.name(j)), false)).join('')}</div>` : ''}
      <div class="chips" style="margin-top:12px">${X.scene === 'year' && I.k >= 0 ? chip(`data-act="incloud" data-v="${I.i}"`, 'Show it in the cloud', false) : ''}${I.k >= 0 ? chip(`data-act="comcloud" data-v="${MD.com(I.k)}"`, 'Its group', false, MLOOK.comHex(MD.com(I.k))) : ''}${chip('data-act="meme" data-v="none"', 'None', false)}</div>`
    : '<p class="sub">No meme picked.</p>'}
    <p class="note">${esc(NOTE.memes)}</p>`;
}

// ----------------------------------------------------------- communities --
// each named group's counts of the data's own marks: its memes in the commons (band 0) and on the shell (band 4)
const COMS = (() => {
  let c = null;
  return () => {
    if (c) return c;
    c = MD.coms.map(x => ({ n: x.n, inner: 0, outer: 0 }));
    for (let k = 0; k < MD.m; k++) { const g = MD.com(k), b = MD.band(k); if (g < c.length) { if (b === 0) c[g].inner++; else if (b === 4) c[g].outer++; } }
    return c;
  };
})();
function comInfo(k) {
  if (k < 0) return null;
  const g = MD.coms[k], c = COMS()[k];
  return { head: comName(k), rows: [['Memes', fmt(g.n)], ['In the commons', fmt(c.inner), pct(c.inner / g.n)], ['On the shell', fmt(c.outer), pct(c.outer / g.n)]], tags: g.tags };
}
function renderComs() {
  const pane = $('#pane-communities');
  if (!pane) return;
  const I = comInfo(X.com);
  pane.innerHTML = `<p class="sub">The ${comNamed()} named groups of the tag network, largest first. Pick one to light it.</p>
    <div class="chips">${comNames().map((n, k) => chip(`data-act="com" data-v="${k}"`, esc(n), X.com === k, MLOOK.comHex(k))).join('')}</div>
    ${I ? `<h3 style="color:${inkCol(MLOOK.comHex(X.com))}">${esc(I.head)}</h3>${statsHtml(I.rows)}<p class="grp-h">Its most typical tags</p><p class="sub">${esc(I.tags.join(', '))}</p>
      <div class="chips">${chip('data-act="com" data-v="none"', 'None', false)}</div>` : '<p class="sub">No group picked.</p>'}
    <p class="note">${esc(NOTE.coms)}</p>`;
}

// ----------------------------------------------------------------- years --
const SNAPS = () => (api('year').snapshots ? api('year').snapshots() : MD.subs.map(s => ({ key: s.key, title: s.title, year: s.year, n: s.n, links: s.links, hot: s.hotN || [] })));
function renderYears() {
  const pane = $('#pane-years');
  if (!pane) return;
  const S = SNAPS(), s = S[X.which];
  pane.innerHTML = `<div class="chips">${S.map((x, j) => chip(`data-act="which" data-v="${j}"`, `${esc(x.title.split(':')[0])} · ${x.year}`, X.which === j)).join('')}</div>
    <h3>${esc(s.title)}, ${s.year}</h3><p class="sub">${fmt(s.n)} memes, ${fmt(s.links)} ties.</p>
    <p class="grp-h">${esc(CT.rise.label)}</p><div class="chips">${CT.rise.options.map(([v, n]) => chip(`data-act="ctl" data-ctl="rise" data-v="${v}"`, esc(n), ctlValue(CT.rise) === v)).join('')}</div>
    <ul class="legend">${s.hot.map(([w, n]) => `<li><span class="sw" style="background:${swCol(CC.hot)}"></span>${esc(w)}: ${fmt(n)} memes</li>`).join('')}</ul>
    <p class="note">${esc(NOTE.years)}</p>`;
}

// ----------------------------------------------------------------- about --
function renderAbout() {
  const pane = $('#pane-about');
  if (!pane) return;
  pane.innerHTML = `<p class="sub">${esc(ABOUT)}</p>
    <p class="grp-h">The hypothesis</p>
    <p class="sub">${esc(HYP_TEXT)}</p>`;
}
// the hypothesis in words (About, page and headset)
const HYP_TEXT = `In the tag network the outside is a shell of tight niches (the outer tenth: a median of ${FACTS.outer.deg} ties, ${pct(FACTS.outer.foreign)} of them to other groups), the inside a commons of classics (the inner tenth: ${FACTS.inner.deg} ties, ${pct(FACTS.inner.foreign)} to other groups). How far in a meme sits follows how much it crosses groups (Spearman's rho ${rho(FACTS.rhoF)}), not its views (${rho(FACTS.rhoV)}) nor its year (${rho(FACTS.rhoY)}). So a meme may reach everyone by crossing groups, not by being seen most. A test: in a later scrape, today's crossing memes should outlast the niche ones. From outside about ${pct(FACTS.hidIn)} of the commons is hidden behind other memes; a flat view still tells centre from edge (AUC ${num(FACTS.auc, 2)}).`;
// labels the panes add (none: the sets label their own picks)
function updateExtraLabels() {}

// ----------------------------------------------------------- canvas input --
const _rc = new THREE.Raycaster(), _m2 = new THREE.Vector2();
// what a ray (a THREE.Raycaster in world coordinates) points at: a meme of the set on show (the cloud answers a net
// index, the year an archive index); { p: its archive index, k: the set that found it } or null (unnamed: none)
function pickWith(rc) {
  if (APP.mode !== 'explore') return null;
  for (const k of ['cloud', 'year']) {
    if ((XS[k + '_a'] || 0) < 0.5) continue;
    const A = api(k);
    let r = -1;
    try { r = A.pick ? A.pick(rc) : -1; } catch (e) { r = -1; }
    if (r && typeof r === 'object') r = r.i;   // (a set answering with an object)
    if (k === 'cloud') r = Number.isInteger(r) && r >= 0 && r < MD.m ? MD.eig(r) : -1;
    if (Number.isInteger(r) && r >= 0 && r < MD.n && MD.name(r)) return { p: r, k };
  }
  return null;
}
// what is under the mouse, in explore mode
function pickAt(mx, my) {
  _m2.set(mx / window.innerWidth * 2 - 1, -(my / window.innerHeight) * 2 + 1);
  _rc.setFromCamera(_m2, GL.camera);
  return pickWith(_rc);
}
// where a pick is, in its set's own frame (for the headset's ray and tip), or null (then where the ray meets the scene)
function pickPos(p) {
  const A = api(p.k);
  if (!A.pos) return null;
  return p.k === 'cloud' ? (netOfMeme(p.p) >= 0 ? A.pos(netOfMeme(p.p)) : null) : A.pos(p.p);
}
function pickText(p) { const k = netOfMeme(p.p); return [MD.name(p.p), k >= 0 ? ` · ${fmt(MD.deg(k))} ties` : MD.year(p.p) ? ` · ${MD.year(p.p)}` : '']; }
// a click (or the trigger) on a meme picks it (again: none), in the Memes tab
function choosePick(p) {
  if (!p) return;
  if (X.tab !== 'memes') showTab('memes');
  selectMeme(p.p === X.meme ? -1 : p.p, false);
}
function bindCanvas() {
  const cv = GL.canvas, tip = $('#tip'), pts = new Map();
  let down = null, pinch = 0;
  cv.addEventListener('pointerdown', ev => {
    pts.set(ev.pointerId, [ev.clientX, ev.clientY]);
    cv.setPointerCapture(ev.pointerId);
    down = { x: ev.clientX, y: ev.clientY, moved: false };
    orbit.held = true;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); }
  });
  cv.addEventListener('pointermove', ev => {
    const explore = APP.mode === 'explore';
    if (pts.has(ev.pointerId) && explore) {
      const p = pts.get(ev.pointerId), dx = ev.clientX - p[0], dy = ev.clientY - p[1];
      pts.set(ev.pointerId, [ev.clientX, ev.clientY]);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch > 0) orbit.cur[2] = clamp(orbit.cur[2] * pinch / d, 0.05, 40);
        pinch = d; down.moved = true; return;
      }
      if (down && Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 4) down.moved = true;
      if (down && down.moved) {
        orbit.to = null;
        orbit.cur[0] -= dx * 0.25; orbit.cur[1] = clamp(orbit.cur[1] + dy * 0.25, -80, 80);
      }
      tip.style.opacity = 0;
      return;
    }
    if (!explore || ev.pointerType === 'touch') { tip.style.opacity = 0; return; }
    const p = pickAt(ev.clientX, ev.clientY);
    cv.style.cursor = p ? 'pointer' : 'grab';
    if (p) {
      const [b, r] = pickText(p);
      tip.innerHTML = `<b>${esc(b)}</b>${esc(r)}`;
      tip.style.transform = `translate(${ev.clientX + 14}px, ${ev.clientY + 12}px)`;
      tip.style.opacity = 1;
    } else tip.style.opacity = 0;
  });
  const end = ev => {
    pts.delete(ev.pointerId);
    if (pts.size < 2) pinch = 0;
    if (APP.mode === 'explore' && down && !down.moved && ev.type === 'pointerup') choosePick(pickAt(ev.clientX, ev.clientY));
    if (!pts.size) { down = null; orbit.held = false; }
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('pointerleave', () => { tip.style.opacity = 0; });
  cv.addEventListener('wheel', ev => {
    if (APP.mode !== 'explore') return;
    ev.preventDefault();
    orbit.to = null;
    orbit.cur[2] = clamp(orbit.cur[2] * Math.exp(ev.deltaY * 0.0012), 0.05, 40);
  }, { passive: false });
}
