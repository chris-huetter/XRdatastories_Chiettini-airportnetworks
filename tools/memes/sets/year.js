// The year: the authors' three one-year snapshots (SPEC.md, "year"), one at a time: politics (every meme of 2020 in their
// politics subnetwork), screens (2019: television, film, streaming) and social media (2020). Each is a glowing disc of
// its memes at the authors' 2D places (MDATA.subs: radius about 1) lying on the floor plane y = 0, with its links faint,
// and its hot topic's memes (the authors' hot words: trump, tiktok, ...) rising out of it in magenta, each hot word's
// memes at a height of its own (0.4 to 0.8), with a tag naming the word and how many memes carry it, and the year as a
// tag over the disc. Ours: the lift into 3D (heights by hot word, a seeded stagger as they rise); the places, links and
// hot marks are the authors'.
// Params: year_a (fade), year_which (step: 0 politics, 1 screens, 2 social media), year_fade (0..1: the snapshot on show
// fades; the engine dips it to change snapshots), year_rise (0..1: the hot topics rise; a function of the param alone).
// Draw calls: a points and a lines object per snapshot (only the one on show is drawn), the floor's rim, the hot words'
// glows: four at a time.
SETS.year = function (K) {
  const { THREE, clamp, smooth } = K;
  const set = K.newSet('year'), LK = TLOOK(K, set), SUBS = MDATA.subs, RGB = MLOOK.RGB, NS = SUBS.length;
  const LIFT0 = 0.4, LIFT1 = 0.8, STAG = 0.3, RISE = 1 - STAG;
  const rng = K.rng(17);
  const HEAD = 'attribute float aH, aD; uniform float uRise, uW; uniform vec3 uHot;';
  // a meme's rise (0..1) and height, the same in the shaders and in picking (riseOf)
  const RISE_GLSL = 'float rr = smoothstep(0.0, 1.0, clamp((uRise - aD) / ' + RISE.toFixed(3) + ', 0.0, 1.0));';
  const riseOf = (u, d) => smooth(clamp((u - d) / RISE, 0, 1));
  // ----------------------------------------------------------- the snapshots
  const SN = SUBS.map((s, si) => {
    const n = s.n, nh = s.hot.length;
    // each hot word's height, and its memes' middle on the floor (its tag stands over it)
    const hgt = s.hot.map((w, j) => (nh > 1 ? LIFT0 + (LIFT1 - LIFT0) * j / (nh - 1) : LIFT1));
    const mid = s.hot.map(() => [0, 0, 0, 0]);
    const H = new Float32Array(n), Dl = new Float32Array(n);
    // points
    const pg = K.pointsGeo(n), pp = pg.attributes.position.array, pc = pg.attributes.aCol.array, ps = pg.attributes.aSize.array;
    pg.setAttribute('aH', new THREE.BufferAttribute(H, 1)); pg.setAttribute('aD', new THREE.BufferAttribute(Dl, 1));
    for (let i = 0; i < n; i++) {
      const x = s.xy[2 * i], z = s.xy[2 * i + 1], h = s.hotOf[i];
      pp[3 * i] = x; pp[3 * i + 2] = z;
      Dl[i] = rng() * STAG;
      if (h) {
        H[i] = hgt[h - 1] + (rng() - 0.5) * 0.03;
        const m = mid[h - 1]; m[0] += x; m[2] += z; m[3]++;
        pc.set(RGB.year, 3 * i); ps[i] = 0.042;
      } else { pc.set(RGB.year, 3 * i); ps[i] = 0.026; }
    }
    mid.forEach((m, j) => { if (m[3]) { m[0] /= m[3]; m[2] /= m[3]; } m[1] = hgt[j]; });
    const uW = { value: 0 }, uRise = { value: 0 }, uHot = { value: new THREE.Vector3().fromArray(RGB.hot) };
    const pm = K.points(set, { uniforms: { uW, uRise, uHot }, head: HEAD, vertex: `
  ${RISE_GLSL}
  pos.y = aH * rr;
  mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = pointPx(aSize * (1.0 + 0.25 * step(0.001, aH) * rr), mv);
  vC = mix(aCol, uHot, step(0.001, aH) * smoothstep(0.0, 0.4, rr));
  vA = aA * uA * uW * (aH > 0.001 ? 1.0 : 0.85 - 0.35 * uRise);
  if (vA < 0.004) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);` });
    const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; set.group.add(pts);
    // links and the hot memes' stems (a faint line from the floor up to where the meme has risen to)
    const nl = s.ij.length / 2;
    let ns = 0; for (let i = 0; i < n; i++) if (s.hotOf[i]) ns++;
    const lg = K.linesGeo(nl + ns), lp = lg.attributes.position.array, lc = lg.attributes.aCol.array, la = lg.attributes.aA.array;
    const LH = new Float32Array(2 * (nl + ns)), LD = new Float32Array(2 * (nl + ns)), LS = new Float32Array(2 * (nl + ns));
    lg.setAttribute('aH', new THREE.BufferAttribute(LH, 1)); lg.setAttribute('aD', new THREE.BufferAttribute(LD, 1)); lg.setAttribute('aS', new THREE.BufferAttribute(LS, 1));
    const vtx = (v, i, top) => {
      lp[3 * v] = pp[3 * i]; lp[3 * v + 2] = pp[3 * i + 2]; LH[v] = top ? H[i] : 0; LD[v] = Dl[i];
    };
    for (let e = 0; e < nl; e++) {
      const a = s.ij[2 * e], b = s.ij[2 * e + 1], hot = s.hotOf[a] && s.hotOf[b], half = !hot && (s.hotOf[a] || s.hotOf[b]);
      vtx(2 * e, a, true); vtx(2 * e + 1, b, true);
      const c = hot ? RGB.hot : RGB.link;
      lc.set(c, 6 * e); lc.set(c, 6 * e + 3);
      la[2 * e] = la[2 * e + 1] = hot ? 0.3 : half ? 0.03 : 0.07;   // (a link up to a risen meme fainter: they fan out)
    }
    let v = 2 * nl;
    for (let i = 0; i < n; i++) if (s.hotOf[i]) {
      vtx(v, i, false); vtx(v + 1, i, true);
      lc.set(RGB.hot, 3 * v); lc.set(RGB.hot, 3 * v + 3);
      la[v] = 0.02; la[v + 1] = 0.22; LS[v] = LS[v + 1] = 1;
      v += 2;
    }
    const lm = K.lines(set, { uniforms: { uW, uRise, uHot }, head: HEAD + ' attribute float aS;', vertex: `
  ${RISE_GLSL}
  pos.y = aH * rr;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  vA *= uW * mix(1.0, rr, aS);` });
    const lines = new THREE.LineSegments(lg, lm); lines.frustumCulled = false; set.group.add(lines);
    // the snapshot's reach, for its rim on the floor
    let r90 = 0; { const rr = []; for (let i = 0; i < n; i++) rr.push(Math.hypot(pp[3 * i], pp[3 * i + 2])); rr.sort((a, b) => a - b); r90 = rr[Math.floor(0.97 * n)]; }
    const hotN = s.hot.map(w => { const f = (s.hotN || []).find(x => x[0] === w); return f ? f[1] : 0; });
    return { s, si, n, pts, lines, uW, uRise, hgt, mid, hotN, H, Dl, r90, nl };
  });
  // the floor's rim: a thin ring round the snapshot on show (TLOOK rings), and a glow over each hot word's memes
  const rings = LK.rings(2), halos = LK.halos(8);
  set.group.add(rings.mesh); set.group.add(halos.mesh);
  const YCOL = RGB.year, HCOL = RGB.hot, UP = [0, 1, 0], O = [0, 0, 0], _h = [0, 0, 0];
  const cur = { w: [0, 0, 0], rise: 0, which: 0 };
  function update(S, t) {
    const which = clamp(Math.round(S.year_which), 0, NS - 1), f = clamp(S.year_fade, 0, 1), rise = clamp(S.year_rise, 0, 1);
    cur.which = which; cur.rise = rise;
    for (let k = 0; k < NS; k++) {
      const w = k === which ? f : 0, sn = SN[k];
      cur.w[k] = w;
      sn.uW.value = w; sn.uRise.value = rise;
      sn.pts.visible = sn.lines.visible = w > 0.003;
    }
    const sn = SN[which];
    rings.begin();
    if (f > 0.003) rings.add(O, UP, sn.r90 + 0.08, 0.004, YCOL, 0.5 * f, 0);
    rings.end();
    halos.begin();
    if (f > 0.003 && rise > 0.05) sn.mid.forEach((m, j) => {
      const r = riseOf(rise, 0.15);
      _h[0] = m[0]; _h[1] = m[1] * r; _h[2] = m[2];
      halos.add(_h, 0.25 + 0.5 * Math.sqrt(sn.hotN[j] / 200), HCOL, 0.3 * f * r * (0.85 + 0.15 * Math.sin(t * 1.3 + j)));
    });
    halos.end();
    LK.depth();
  }
  // ------------------------------------------------------------- labels
  // the year over the disc; each hot word over its memes (its count of memes: the authors' hot marks)
  const labels = [];
  SN.forEach((sn, k) => {
    labels.push({ text: [String(sn.s.year), ` · ${sn.s.title.toLowerCase().split(':')[0]} · ${sn.n.toLocaleString('en-US')} memes`], at: 'top', cls: '',
      alpha: S => (Math.round(S.year_which) === k ? clamp(S.year_fade, 0, 1) : 0) });
    sn.s.hot.forEach((w, j) => labels.push({ text: [w, ` · ${sn.hotN[j]} memes`], at: () => hotAt(k, j), cls: 'mag', minor: sn.hotN[j] < 10,
      alpha: S => (Math.round(S.year_which) === k ? clamp(S.year_fade, 0, 1) * smooth(clamp((S.year_rise - 0.5) / 0.4, 0, 1)) : 0) }));
  });
  // a hot word's tag point: over its memes' middle, where they have risen to
  const HA = SN.map(sn => sn.mid.map(() => [0, 0, 0]));
  function hotAt(k, j) {
    const m = SN[k].mid[j], o = HA[k][j];
    if (!m) return [0, 0, 0];
    o[0] = m[0]; o[1] = m[1] * riseOf(cur.rise, 0.15) + 0.07; o[2] = m[2];
    return o;
  }
  // -------------------------------------------------------------- picking
  const _inv = new THREE.Matrix4(), _ray = new THREE.Ray();
  // a ray (a THREE.Raycaster in world coordinates) to the nearest named meme of the snapshot on show within a small angle:
  // its archive index, or -1 (unnamed memes are never picked: they are never named)
  function pick(raycaster) {
    if (set.uA.value < 0.5 || cur.w[cur.which] < 0.5) return -1;
    set.group.updateMatrixWorld();
    _ray.copy(raycaster.ray).applyMatrix4(_inv.copy(set.group.matrixWorld).invert());
    const o = _ray.origin, d = _ray.direction, sn = SN[cur.which], s = sn.s;
    let best = -1, bs = 0.022;
    for (let i = 0; i < sn.n; i++) {
      if (!MDATA.name(s.idx[i])) continue;
      const x = s.xy[2 * i] - o.x, y = sn.H[i] * riseOf(cur.rise, sn.Dl[i]) - o.y, z = s.xy[2 * i + 1] - o.z, along = x * d.x + y * d.y + z * d.z;
      if (along <= 0) continue;
      const off = Math.sqrt(Math.max(0, x * x + y * y + z * z - along * along)) / along;
      if (off < bs) { bs = off; best = s.idx[i]; }
    }
    return best;
  }
  // a meme's place now in the snapshot on show (archive index), or null
  function pos(i, out) {
    const sn = SN[cur.which], s = sn.s;
    for (let k = 0; k < sn.n; k++) if (s.idx[k] === i) {
      const o = out || [0, 0, 0];
      o[0] = s.xy[2 * k]; o[1] = sn.H[k] * riseOf(cur.rise, sn.Dl[k]); o[2] = s.xy[2 * k + 1];
      return o;
    }
    return null;
  }
  const API = {
    pick, pos,
    hot: (j, k) => hotAt(k === undefined ? cur.which : k, j),
    // the snapshots in words, for the panes: [{ key, title, year, n, links, hot: [[word, memes]] }]
    snapshots: () => SN.map(sn => ({ key: sn.s.key, title: sn.s.title, year: sn.s.year, n: sn.n, links: sn.nl, hot: sn.s.hot.map((w, j) => [w, sn.hotN[j]]) })),
  };
  const anchors = { centre: [0, 0, 0], top: [0, 1.02, 0] };
  for (let j = 0; j < 5; j++) anchors['hot' + j] = () => hotAt(cur.which, j);
  return Object.assign(set, {
    params: { year_a: 1, year_which: 0, year_fade: 1, year_rise: 1 },
    update,
    anchors,
    labels,
    cam: { default: [0, 30, 4.0, 0, 0.3, 0], low: [24, 9, 3.8, 0, 0.38, 0], above: [0, 78, 4.1, 0, 0, 0] },
    controls: [], explore() { return {}; },
    api: () => API,
  });
};
