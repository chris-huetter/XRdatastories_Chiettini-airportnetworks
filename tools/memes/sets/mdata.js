// MDATA: MEMES_DATA decoded once, and the lookups the sets and the engine share. No science here: every place, link and
// number is the authors' (MEMES_DATA, written by data/gen_data.py from their repository) or the generator's documented
// measures; these only decode the strings and look things up.
// Memes are archive indices 0..n-1 (nodesALL's order, 29,610). The tag network's 17,243 memes are also numbered 0..m-1
// (net indices: eig(k) gives the archive index, netOf(i) the net index or -1).
// The story's frame: each 3D layout centred on its median and scaled so 90 % of its memes lie within radius 1.2.
//   n, m                         29,610 memes in the archive, 17,243 in the tag network
//   name(i)                      a meme's name ('' when it is not named: outside the tag network and the year snapshots,
//                                or flagged: pornographic, shock media, gore or racist by its own tags; never show those)
//   find(name), search(text, max) an archive index by name (any case; -1 none); named memes matching, most viewed first
//   year(i), views(i)            its year (0 unknown), its views (rounded on a log scale: about 10 % off)
//   archive                      Float32Array(3n): the archive layout (by tag similarity), story frame; jcLinks, jcAlone
//                                (memes with no link there: 11,906), jcComponents; alone(i): whether meme i is one of them
//   eig(k), netOf(i)             net index -> archive index; archive -> net index or -1
//   net                          Float32Array(3m): the tag network's layout (story frame)
//   com(k)                       its community (0..26, by size; 255 none); coms: [{ n, tags, centre }]
//   nb(k), w(k)                  its kept links (each meme's 12 strongest by shared tags, both ways: 117,840) and their
//                                weights (shared tags); deg(k) and foreign(k) (0..1) over all its 387,453 links
//   tags(k)                      up to 4 of its tags (rarest first; none for a flagged meme)
//   radius(k)                    its distance from the net layout's centre; RADII: [10 %, 25 %, 75 %, 90 %] quantiles;
//                                band(k): 0 inner 10 %, 1 inner 25 %, 2 middle, 3 outer 25 %, 4 outer 10 %
//   subs                         the three one-year snapshots: [{ key, title, n, links, year, hot (names), hotN, idx
//                                (Uint16Array, archive indices), xy (Float32Array(2n), radius about 1), ij (Uint16Array,
//                                pairs of snapshot indices), hotOf (Uint8Array: 0 none, else 1 + index into hot) }]
//   hyp                          the hypothesis' numbers (MEMES_DATA.hyp: see the generator's header), core and shellEx
//                                as net indices
//   facts, about
const MDATA = (() => {
  const D = typeof MEMES_DATA !== 'undefined' ? MEMES_DATA : null;
  if (!D) return null;
  const bytesOf = s => {
    const bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
    const b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  };
  const b64 = (s, Type) => { const b = bytesOf(s); return new Type(b.buffer, 0, b.length / Type.BYTES_PER_ELEMENT); };
  const varints = (b, out) => { let v = 0, sh = 0, k = 0; for (let i = 0; i < b.length; i++) { v += (b[i] & 127) * Math.pow(2, sh); if (b[i] & 128) sh += 7; else { out[k++] = v; v = 0; sh = 0; } } return k; };
  const n = D.n, m = D.m;
  const names = D.names.split('\t');
  const yr = b64(D.year, Uint8Array), vw = b64(D.views, Uint8Array);
  const deq = (s, lim, k) => { const u = b64(s, Uint16Array), out = new Float32Array(u.length); for (let i = 0; i < u.length; i++) out[i] = (u[i] / 65535 - 0.5) * 2 * lim; return out; };
  const archive = deq(D.jc.pos, D.jc.lim), net = deq(D.eig.pos, D.eig.lim);
  const aloneB = bytesOf(D.jc.aloneBits), alone = i => (aloneB[i >> 3] >> (i & 7)) & 1;
  const E = b64(D.eig.idx, Uint16Array), back = new Int32Array(n).fill(-1);
  for (let k = 0; k < m; k++) back[E[k]] = k;
  const comArr = b64(D.eig.com, Uint8Array), degArr = b64(D.eig.deg, Uint16Array), forArr = b64(D.eig.foreign, Uint8Array);
  // kept links, both ways (CSR)
  const raw = bytesOf(D.eig.adj), vals = new Uint32Array(raw.length), nv = varints(raw, vals), wraw = bytesOf(D.eig.w);
  const cnt = new Uint32Array(m), lo = [], lw = [];
  { let p = 0, q = 0; for (let i = 0; i < m; i++) { const k = vals[p++]; let a = i; for (let j = 0; j < k; j++) { a += vals[p++]; lo.push(i, a); lw.push(wraw[q++]); cnt[i]++; cnt[a]++; } } if (p !== nv) throw new Error('MEMES_DATA.eig.adj: bad length'); }
  const off = new Uint32Array(m + 1); for (let i = 0; i < m; i++) off[i + 1] = off[i] + cnt[i];
  const nbs = new Uint16Array(off[m]), wts = new Uint8Array(off[m]), fill = off.slice(0, m);
  for (let j = 0; j < lo.length; j += 2) { const a = lo[j], b = lo[j + 1], w = lw[j >> 1]; nbs[fill[a]] = b; wts[fill[a]++] = w; nbs[fill[b]] = a; wts[fill[b]++] = w; }
  // tags
  const vocab = D.vocab.split('\t'), traw = bytesOf(D.eig.tags), tv = new Uint32Array(traw.length), tn = varints(traw, tv), toff = new Uint32Array(m + 1);
  { let p = 0; for (let k = 0; k < m; k++) { toff[k] = p; p += 1 + tv[p]; } toff[m] = p; if (p !== tn) throw new Error('MEMES_DATA.eig.tags: bad length'); }
  const tags = k => { const p = toff[k], c = tv[p], out = []; for (let j = 1; j <= c; j++) out.push(vocab[tv[p + j]]); return out; };
  const RADII = D.hyp.radii;
  const radius = k => Math.hypot(net[3 * k], net[3 * k + 1], net[3 * k + 2]);
  const band = k => { const r = radius(k); return r < RADII[0] ? 0 : r < RADII[1] ? 1 : r < RADII[2] ? 2 : r < RADII[3] ? 3 : 4; };
  const byName = new Map(); names.forEach((s, i) => { if (s) byName.set(s.toUpperCase(), i); });
  const views = i => (vw[i] ? Math.round(Math.pow(10, vw[i] / 25) - 1) : 0);
  function search(text, max = 12) {
    const q = String(text || '').trim().toUpperCase(); if (!q) return [];
    const a = [];
    for (let i = 0; i < n; i++) if (names[i] && names[i].toUpperCase().includes(q)) a.push(i);
    a.sort((x, y) => (names[x].toUpperCase().startsWith(q) ? 0 : 1) - (names[y].toUpperCase().startsWith(q) ? 0 : 1) || vw[y] - vw[x]);
    return a.slice(0, max);
  }
  const subs = D.subs.map(s => {
    const xy = b64(s.xy, Uint16Array), f = new Float32Array(xy.length);
    for (let i = 0; i < xy.length; i++) f[i] = (xy[i] / 65535 - 0.5) * 2 * s.lim;
    return { key: s.key, title: s.title, n: s.n, links: s.links, year: s.year, hot: s.hot, hotN: s.hotN, idx: b64(s.idx, Uint16Array), xy: f, ij: b64(s.ij, Uint16Array), hotOf: b64(s.hotOf, Uint8Array) };
  });
  return {
    n, m, name: i => names[i] || '', find: s => { const i = byName.get(String(s || '').trim().toUpperCase()); return i === undefined ? -1 : i; }, search,
    year: i => (yr[i] ? 1980 + yr[i] : 0), views,
    archive, alone, jcLinks: D.jc.links, jcAlone: D.jc.alone, jcComponents: D.jc.components,
    eig: k => E[k], netOf: i => back[i], net, com: k => comArr[k], coms: D.coms,
    nb: k => nbs.subarray(off[k], off[k + 1]), w: k => wts.subarray(off[k], off[k + 1]), kept: D.eig.kept,
    deg: k => degArr[k], foreign: k => forArr[k] / 255, netLinks: D.eig.links,
    tags, radius, band, RADII, subs, hyp: D.hyp, facts: D.facts, about: D.about, flagged: D.flagged,
  };
})();
if (typeof module !== 'undefined') module.exports = MDATA;
