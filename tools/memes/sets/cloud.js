// cloud: the memes of Know Your Meme between the authors' two 3D layouts (the Memes_Data repository through MDATA): the
// archive (29,610 memes placed by the tags they share) and the tag network (its 17,243 memes placed by the eigenvector
// layout of their weighted ties), as glowing points that flow from one to the other as cloud_layout eases from 0 to 1
// (each meme on its own seeded delay, with a sideways swirl; the 12,367 not in the network drift a little outward and
// fade). The network's kept ties are drawn within budget (each meme's three strongest, about 41k), their ends following
// the points; communities take their colours, the outer shell of niches brightens cool, the inner commons glows gold,
// the commons' ties to other communities run out in amber, the classics carry their names. Every place, tie and number
// is the authors' or the generator's (MDATA); every number in a tag is read from MDATA. Adapted from the CDK5 story's net
// set (tools/cdk5/sets/net.js: the move on the GPU and the same function on the CPU, links following the points, halos,
// rings, labels facing the eye, picking with world rays, the near-eye fade, the depth cue).
SETS.cloud = function (K) {
  const { THREE, clamp, prog } = K;
  const set = K.newSet('cloud');
  const n = MDATA.n, m = MDATA.m, H = MDATA.hyp, COMS = MDATA.coms, RGB = MLOOK.RGB;
  const LK = TLOOK(K, set);
  const R = K.rng(29610);
  const fmt = v => Math.round(v).toLocaleString('en-GB');
  const pct = f => Math.round(f * 100) + ' %';
  // a share in words where it is a plain fraction ("a third"), else a percentage
  const share = f => (Math.abs(f - 1 / 3) < 0.02 ? 'a third' : Math.abs(f - 0.25) < 0.02 ? 'a quarter' : Math.abs(f - 0.5) < 0.02 ? 'half' : pct(f));
  const D = 1 / 3, INVD = 1 / (1 - D);        // the longest delay (a third of the move) and the move's speed after it
  const rad = d => d * Math.PI / 180;
  // the default view's direction (az, el as the engine's views take them)
  const AZ = 25, EL = 14;
  const FRONT = [Math.cos(rad(EL)) * Math.sin(rad(AZ)), Math.sin(rad(EL)), Math.cos(rad(EL)) * Math.cos(rad(AZ))];

  // ---------------------------------------------------------------- the communities' names
  // short plain names for the 19 named communities (0..18, by size: MLOOK colours these, greys the rest), after their most
  // typical tags (COMS[k].tags, which the tags show beside the name); 19 (wrestling, 50 memes) is named for explore only
  const COMNAME = ['Music', 'Social platforms', 'Image macros', '4chan', 'Politics', 'General memes', 'Anime', 'Film', 'Games',
    'Streamers', 'Creepypasta', 'Phones', 'TV', 'Covid', 'Cartoons', 'Sport', 'French TV', 'Gym', 'Adverts', 'Wrestling'];
  const NAMED = 19;
  const comName = k => COMNAME[k] || 'Small group';

  // ---------------------------------------------------------------- who is who
  // per archive meme: its net index (or -1), the archive's lonely ones (MDATA.alone(i) where the data says so per meme;
  // else, the nearest the data offers: the memes outside the tag network, see cloud.md), the band and community
  const NET = new Int32Array(n), EIG = new Int32Array(m);
  for (let i = 0; i < n; i++) NET[i] = MDATA.netOf(i);
  for (let k = 0; k < m; k++) EIG[k] = MDATA.eig(k);
  const aloneOf = typeof MDATA.alone === 'function' ? i => !!MDATA.alone(i) : i => NET[i] < 0;
  const BAND = new Uint8Array(m), COM = new Uint8Array(m);
  for (let k = 0; k < m; k++) { BAND[k] = MDATA.band(k); COM[k] = MDATA.com(k); }
  const CORE = H.core.slice(), ISCORE = new Uint8Array(m);
  for (const k of CORE) ISCORE[k] = 1;
  let DMAX = 1; for (let k = 0; k < m; k++) DMAX = Math.max(DMAX, MDATA.deg(k));
  const LDEG = Math.log(1 + DMAX);
  const RND = new Float32Array(n); for (let i = 0; i < n; i++) RND[i] = R();
  const ST = new Float32Array(n); for (let i = 0; i < n; i++) ST[i] = D * RND[i];

  // ---------------------------------------------------------------- the ties drawn
  // each meme's three strongest kept ties (by shared tags; ties by the other's index), both ways, once each: about 41k
  const TOPK = 3, TOP = new Int32Array(TOPK * m).fill(-1), TW = new Int32Array(TOPK);
  let WMAX = 1;
  for (let k = 0; k < m; k++) {
    const nb = MDATA.nb(k), w = MDATA.w(k), t = TOPK * k;
    TW.fill(-1);
    for (let j = 0; j < nb.length; j++) {
      if (w[j] > WMAX) WMAX = w[j];
      // insert into the top three (strongest first; equal weights by the lower index)
      for (let s = 0; s < TOPK; s++) {
        const c = TOP[t + s];
        if (c < 0 || w[j] > TW[s] || (w[j] === TW[s] && nb[j] < c)) {
          for (let u = TOPK - 1; u > s; u--) { TOP[t + u] = TOP[t + u - 1]; TW[u] = TW[u - 1]; }
          TOP[t + s] = nb[j]; TW[s] = w[j]; break;
        }
      }
    }
  }
  function wOf(k, j) { const nb = MDATA.nb(k), w = MDATA.w(k); for (let s = 0; s < nb.length; s++) if (nb[s] === j) return w[s]; return 0; }
  const inTop = (k, j) => TOP[TOPK * k] === j || TOP[TOPK * k + 1] === j || TOP[TOPK * k + 2] === j;
  const inMain = (a, b) => inTop(a, b) || inTop(b, a);
  const MAIN = [];
  for (let k = 0; k < m; k++) for (let s = 0; s < TOPK; s++) {
    const j = TOP[TOPK * k + s];
    if (j < 0) continue;
    if (j > k || !inTop(j, k)) MAIN.push(k, j);   // (j < k with k in j's top three was taken from j's side)
  }
  const NMAIN = MAIN.length / 2;
  const LW = Math.log(WMAX);
  const wn = (a, b) => clamp(Math.log(Math.max(1, wOf(a, b))) / LW, 0, 1);
  // the commons' ties to other communities (the commons' kept ties whose ends differ in community; commons end first)
  const CROSS = [];
  for (let k = 0; k < m; k++) {
    if (BAND[k] !== 0) continue;
    for (const j of MDATA.nb(k)) if (COM[j] !== COM[k] && (BAND[j] !== 0 || j > k)) CROSS.push(k, j);
  }
  const NCROSS = CROSS.length / 2;
  // each community's members (for its extra ties when it is lit)
  const CMEM = COMS.map(() => []);
  for (let k = 0; k < m; k++) if (COM[k] < COMS.length) CMEM[COM[k]].push(k);
  let MAXNB = 0; for (let k = 0; k < m; k++) MAXNB = Math.max(MAXNB, MDATA.nb(k).length);
  // a lit community draws its other kept ties too (up to COMCAP), so at most about 60k segments are ever drawn at once
  const COMCAP = Math.max(0, Math.min(12000, 60000 - NMAIN - NCROSS - MAXNB));

  // ---------------------------------------------------------------- shared GLSL: the move, the view
  const MOVE = `
uniform float uL, uInvD, uGrow, uNear;
// a meme on its way from the archive (a) to the tag network (b): eased after its own delay (st), with a sideways bow about
// the vertical (all bows turn the same way: a swirl); growing in from the centre (g)
vec3 place(vec3 a, vec3 b, float st, out float e, out float g) {
  e = clamp((uL - st) * uInvD, 0.0, 1.0); e = e * e * (3.0 - 2.0 * e);
  vec3 d = b - a, p = a + d * e;
  p += vec3(-d.z, 0.0, d.x) * (0.16 * sin(3.14159265 * e));
  float r = min(length(p) / 1.3, 1.0);
  g = clamp((uGrow - 0.25 * r - 0.2 * fract(st * 9.73)) / 0.55, 0.0, 1.0); g = g * g * (3.0 - 2.0 * g);
  return p * g;
}
float ease(float st) { float e = clamp((uL - st) * uInvD, 0.0, 1.0); return e * e * (3.0 - 2.0 * e); }
// x the depth cue (brighter in front of the cloud's centre, darker behind; off near the centre, so standing inside is
// even), y the fade near the eye (in the set's units, and in a headset also nothing within uNear of the eyes, in the
// world's units: metres there; the engine sets it through api().near)
vec2 viewFx(vec4 mv) {
  float sc = length(modelViewMatrix[0].xyz);
  vec3 o = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  float cd = length(o) / sc, far = smoothstep(0.4, 1.2, cd);
  float cue = mix(1.0, clamp(1.0 - (o.z - mv.z) / sc * 0.5, 0.45, 1.35), far);
  float d = length(mv.xyz);
  return vec2(cue, smoothstep(0.06, 0.17, d / sc) * smoothstep(uNear, uNear * 1.5 + 1e-4, d));
}
float bit(float x, float b) { return mod(floor(x / exp2(b)), 2.0); }
`;
  const Ucol = c => ({ value: new THREE.Color(c) });
  const U = {
    uL: { value: 0 }, uInvD: { value: INVD }, uGrow: { value: 1 }, uNear: { value: 0 }, uAlone: { value: 0 }, uLinks: { value: 0 }, uComCol: { value: 0 },
    uShell: { value: 0 }, uCommons: { value: 0 }, uCross: { value: 0 }, uPulse: { value: 0 }, uCore: { value: 0 }, uCom: { value: -1 },
    uPickOn: { value: 0 }, uPickA: { value: 0.3 },
    uMemeC: Ucol(MLOOK.C.meme), uAloneC: Ucol(MLOOK.C.alone), uShellC: Ucol(MLOOK.C.shell), uCommC: Ucol(MLOOK.C.commons),
    uPickC: Ucol(MLOOK.C.pick), uCrossC: Ucol(MLOOK.C.cross), uLinkC: Ucol(MLOOK.C.link),
  };
  const mat = (vs, fs) => {
    const mt = new THREE.ShaderMaterial({
      uniforms: Object.assign({ uA: set.uA, uPx: K.U.uPx, uTime: K.U.uTime }, U),
      vertexShader: K.GLSL + MOVE + vs, fragmentShader: fs,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    set.mats.push(mt);
    return mt;
  };
  const attr = (g, name, arr, k) => { const b = new THREE.BufferAttribute(arr, k); g.setAttribute(name, b); return b; };
  const BS = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2.8);

  // ---------------------------------------------------------------- the memes
  // position: the archive; aPb: the tag network (or, outside it, the archive drifted outward); aCc: the community's colour;
  // aS: delay, flags (1 in the network, 2 alone in the archive, 4 a classic), band (5 none), community (255 none);
  // aI: extra size by ties, twinkle phase; aH: 2 picked, 1 its tie, 0 neither
  const PA = MDATA.archive, PB = new Float32Array(3 * n), CC = new Float32Array(3 * n), PS = new Float32Array(4 * n), PI = new Float32Array(2 * n), PH = new Float32Array(n);
  const _c = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const k = NET[i], i3 = 3 * i;
    if (k >= 0) {
      PB[i3] = MDATA.net[3 * k]; PB[i3 + 1] = MDATA.net[3 * k + 1]; PB[i3 + 2] = MDATA.net[3 * k + 2];
      MLOOK.com(COM[k], _c); CC[i3] = _c[0]; CC[i3 + 1] = _c[1]; CC[i3 + 2] = _c[2];
    } else {
      const f = 1.12 + 0.12 * RND[(i * 7919) % n];
      PB[i3] = PA[i3] * f; PB[i3 + 1] = PA[i3 + 1] * f; PB[i3 + 2] = PA[i3 + 2] * f;
      CC[i3] = RGB.meme[0]; CC[i3 + 1] = RGB.meme[1]; CC[i3 + 2] = RGB.meme[2];
    }
    PS[4 * i] = ST[i];
    PS[4 * i + 1] = (k >= 0 ? 1 : 0) + (aloneOf(i) ? 2 : 0) + (k >= 0 && ISCORE[k] ? 4 : 0);
    PS[4 * i + 2] = k >= 0 ? BAND[k] : 5;
    PS[4 * i + 3] = k >= 0 ? COM[k] : 255;
    PI[2 * i] = k >= 0 ? 0.005 * Math.log(1 + MDATA.deg(k)) / LDEG : 0;
    PI[2 * i + 1] = RND[(i * 104729) % n] * 6.2832;
  }
  const pg = new THREE.BufferGeometry();
  attr(pg, 'position', PA, 3); attr(pg, 'aPb', PB, 3); attr(pg, 'aCc', CC, 3); attr(pg, 'aS', PS, 4); attr(pg, 'aI', PI, 2);
  const aPH = attr(pg, 'aH', PH, 1);
  pg.boundingSphere = BS;
  const ptMat = mat(`
attribute vec3 aPb, aCc; attribute vec4 aS; attribute vec2 aI; attribute float aH;
uniform float uA, uAlone, uComCol, uShell, uCommons, uCore, uCom, uPickOn;
uniform vec3 uMemeC, uAloneC, uShellC, uCommC, uPickC;
varying vec3 vC; varying float vA, vHot;
void main() {
  float e, g;
  vec3 p = place(position, aPb, aS.x, e, g);
  float fl = aS.y, inNet = bit(fl, 0.0), alone = bit(fl, 1.0), core = bit(fl, 2.0), band = aS.z;
  vec3 col = uMemeC;
  // (the network's layout is dense at its middle: its memes a little fainter)
  float br = 0.7 - 0.22 * e * inNet, sz = 0.011 + aI.x, hot = 0.0;
  // the archive's lonely memes: faint grey, while the archive shows
  float al = alone * uAlone * (1.0 - e);
  col = mix(col, uAloneC, al); br *= 1.0 - 0.45 * al; sz *= 1.0 - 0.25 * al;
  // the community's colour (memes in the network)
  col = mix(col, aCc, uComCol * inNet);
  // the outer shell (bands 3 and 4) brightens cool, the rest dims
  float isSh = inNet * step(2.5, band) * step(band, 4.5), isCm = inNet * (1.0 - step(0.5, band));
  col = mix(col, uShellC, 0.45 * isSh * uShell); br *= 1.0 + 0.45 * isSh * uShell - 0.78 * uShell * (1.0 - isSh);
  // the commons (band 0) glows gold, the rest dims
  col = mix(col, uCommC, 0.85 * isCm * uCommons); br *= 1.0 + 0.45 * isCm * uCommons - 0.8 * uCommons * (1.0 - isCm);
  sz *= 1.0 + 0.3 * isCm * uCommons;
  // the classics, named: a little larger and whiter gold
  float cr = core * uCore;
  col = mix(col, mix(uCommC, vec3(1.0), 0.35), cr); br *= 1.0 + 0.8 * cr; sz *= 1.0 + 1.1 * cr; hot = max(hot, 0.6 * cr);
  // a community lit (the rest dims)
  float on = step(-0.5, uCom), isC = on * (1.0 - step(0.5, abs(aS.w - uCom)));
  col = mix(col, aCc, isC); br *= mix(1.0, 0.16 + 1.1 * isC, on); sz *= 1.0 + 0.25 * isC;
  // the picked meme and its ties
  float pk = step(1.5, aH) * uPickOn, pn = step(0.5, aH) * (1.0 - step(1.5, aH)) * uPickOn;
  col = mix(col, uPickC, 0.9 * pk + 0.45 * pn); br *= 1.0 + 0.9 * pk + 0.4 * pn - 0.45 * uPickOn * (1.0 - max(pk, pn));
  sz *= 1.0 + 1.6 * pk + 0.4 * pn; hot = max(hot, pk);
  // a slow twinkle
  br *= 1.0 - 0.18 * (0.5 + 0.5 * sin(uTime * 1.1 + aI.y));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec2 fx = viewFx(mv);
  gl_Position = projectionMatrix * mv;
  // never a blob close up: at most about 0.6 degrees across (1.4 for the picked one); standing inside, the commons is
  // all within arm's reach
  sz = min(sz, (0.011 + 0.014 * max(pk, cr)) * length(mv.xyz) / length(modelViewMatrix[0].xyz));
  gl_PointSize = pointPx(sz * mix(0.3, 1.0, g), mv);
  vC = col * max(br, 0.0) * fx.x; vHot = hot;
  // memes outside the network fade as they drift out
  vA = uA * g * fx.y * (1.0 - e * (1.0 - inNet));
  if (vA < 0.004) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`, `
varying vec3 vC; varying float vA, vHot;
void main() {
  vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0;
  if (d > 1.0) discard;
  float core = smoothstep(0.62, 0.12, d), halo = pow(1.0 - d, 2.0);
  gl_FragColor = vec4(vC * (0.6 + 0.55 * core) + vec3(0.95) * vHot * smoothstep(0.45, 0.0, d), vA * (core * 0.75 + halo * (0.45 + 0.35 * vHot)));
}`);
  const points = new THREE.Points(pg, ptMat);
  points.renderOrder = 3; set.group.add(points);

  // ---------------------------------------------------------------- ties (two geometries, one shader)
  // per vertex: position, aPb (its meme's two places), aCc (its meme's community colour), aL (its delay, the other end's,
  // the tie's weight 0..1, 0 at the first end and 1 at the second), aM (its band, the community both ends share or 255,
  // kind: 0 the strongest three, 1 the commons' crossing ties, 2 a lit community's others, 3 the picked meme's)
  function linkGeo(cap) {
    const g = new THREE.BufferGeometry(), A = {
      P: new Float32Array(6 * cap), B: new Float32Array(6 * cap), C: new Float32Array(6 * cap), L: new Float32Array(8 * cap), M: new Float32Array(6 * cap),
    };
    A.aP = attr(g, 'position', A.P, 3); A.aB = attr(g, 'aPb', A.B, 3); A.aC = attr(g, 'aCc', A.C, 3); A.aL = attr(g, 'aL', A.L, 4); A.aM = attr(g, 'aM', A.M, 3);
    g.boundingSphere = BS; A.g = g;
    return A;
  }
  // one tie (net indices a, b) at segment e of geometry A
  function putTie(A, e, a, b, kind) {
    const ia = EIG[a], ib = EIG[b], cp = COM[a] === COM[b] ? COM[a] : 255;
    // (long ties of the plain kinds fade: they cross the whole cloud and drown it; the crossing and the picked meme's keep)
    const len = Math.hypot(PB[3 * ia] - PB[3 * ib], PB[3 * ia + 1] - PB[3 * ib + 1], PB[3 * ia + 2] - PB[3 * ib + 2]);
    const w = wn(a, b) * (kind === 0 || kind === 2 ? 1 - 0.85 * K.smooth((len - 0.35) / 0.9) : 1);
    for (let s = 0; s < 2; s++) {
      const v = 2 * e + s, me = s ? ib : ia, ot = s ? ia : ib, k = s ? b : a;
      for (let c = 0; c < 3; c++) { A.P[3 * v + c] = PA[3 * me + c]; A.B[3 * v + c] = PB[3 * me + c]; A.C[3 * v + c] = CC[3 * me + c]; }
      A.L[4 * v] = ST[me]; A.L[4 * v + 1] = ST[ot]; A.L[4 * v + 2] = w; A.L[4 * v + 3] = s;
      A.M[3 * v] = BAND[k]; A.M[3 * v + 1] = cp; A.M[3 * v + 2] = kind;
    }
  }
  const touch = (A, from, count) => {
    for (const b of [A.aP, A.aB, A.aC, A.aL, A.aM]) { b.needsUpdate = true; b.updateRange.offset = 2 * from * b.itemSize; b.updateRange.count = 2 * count * b.itemSize; }
  };
  const lnMat = mat(`
attribute vec3 aPb, aCc, aM; attribute vec4 aL;
uniform float uA, uLinks, uComCol, uShell, uCommons, uCross, uCom, uPickOn, uPickA;
uniform vec3 uLinkC, uShellC, uCommC, uCrossC, uPickC;
varying vec3 vC; varying float vA, vS, vK;
void main() {
  float e, g;
  vec3 p = place(position, aPb, aL.x, e, g);
  // a tie of the network shows once both its ends have nearly arrived (nothing drawn between flying ends)
  float k = smoothstep(0.6, 1.0, min(e, ease(aL.y))) * smoothstep(0.7, 1.0, uGrow);
  float kind = aM.z, band = aM.x, w = aL.z;
  float isSh = step(2.5, band), isCm = 1.0 - step(0.5, band);
  float on = step(-0.5, uCom), isC = on * (1.0 - step(0.5, abs(aM.y - uCom)));
  vec3 col; float a;
  if (kind < 0.5) {
    col = mix(uLinkC, aCc, uComCol);
    col = mix(col, uShellC, 0.4 * isSh * uShell);
    col = mix(col, uCommC, 0.6 * isCm * uCommons);
    a = uLinks * 0.07 * w * (1.0 + 0.6 * isSh * uShell - 0.75 * uShell * (1.0 - isSh))
      * (1.0 - 0.8 * uCommons * (1.0 - isCm)) * mix(1.0, 0.12 + 2.2 * isC, on) * (1.0 - 0.6 * uPickOn);
    col = mix(col, aCc, isC);
  } else if (kind < 1.5) {
    col = uCrossC; a = uCross * (0.05 + 0.04 * w);
  } else if (kind < 2.5) {
    col = aCc; a = isC * 0.16 * w * max(uLinks, 0.5);
  } else {
    col = uPickC; a = uPickOn * uPickA * (0.6 + 0.4 * w);
  }
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec2 fx = viewFx(mv);
  gl_Position = projectionMatrix * mv;
  vC = col * fx.x; vS = aL.w; vK = kind;
  vA = uA * a * k * fx.y;
}`, `
uniform float uTime, uPulse;
varying vec3 vC; varying float vA, vS, vK;
void main() {
  if (vA < 0.002) discard;
  float a = vA;
  // the commons' crossing ties: light running out from the commons to the other end
  if (vK > 0.5 && vK < 1.5) { float f = fract(vS * 1.6 - uTime * (0.3 + 0.25 * uPulse)); a *= 0.55 + (0.9 + 1.4 * uPulse) * smoothstep(0.72, 0.97, f) * (1.0 - smoothstep(0.97, 1.0, f)); }
  gl_FragColor = vec4(vC, a);
}`);
  // the strongest three, filled once
  const LM = linkGeo(NMAIN);
  for (let e = 0; e < NMAIN; e++) putTie(LM, e, MAIN[2 * e], MAIN[2 * e + 1], 0);
  const mainLines = new THREE.LineSegments(LM.g, lnMat);
  mainLines.renderOrder = 0; set.group.add(mainLines);
  // the crossing ties (filled once), then a lit community's others and the picked meme's (filled on change)
  const XCAP = NCROSS + COMCAP + MAXNB;
  const LX = linkGeo(XCAP);
  for (let e = 0; e < NCROSS; e++) putTie(LX, e, CROSS[2 * e], CROSS[2 * e + 1], 1);
  let xUsed = NCROSS;
  LX.g.setDrawRange(0, 2 * xUsed);
  const xLines = new THREE.LineSegments(LX.g, lnMat);
  xLines.renderOrder = 1; set.group.add(xLines);

  // ---------------------------------------------------------------- halos and rings (TLOOK)
  const halos = LK.halos(48); halos.mesh.renderOrder = 5; set.group.add(halos.mesh);
  const rings = LK.rings(1); rings.mesh.renderOrder = 2; set.group.add(rings.mesh);

  // ---------------------------------------------------------------- state, and the move on the CPU (the shader's place)
  const cur = { L: 0, grow: 1, pick: -2, com: -2, comA: 0, core: 0, commons: 0, cross: 0, shell: 0, alone: 0, comCol: 0 };
  let _e = 0, _g = 1;
  function placeAt(i, out) {
    const i3 = 3 * i, ax = PA[i3], ay = PA[i3 + 1], az = PA[i3 + 2];
    let e = clamp((cur.L - ST[i]) * INVD, 0, 1); e = e * e * (3 - 2 * e);
    const dx = PB[i3] - ax, dy = PB[i3 + 1] - ay, dz = PB[i3 + 2] - az, bow = 0.16 * Math.sin(Math.PI * e);
    const x = ax + dx * e - dz * bow, y = ay + dy * e, z = az + dz * e + dx * bow;
    const r = Math.min(Math.hypot(x, y, z) / 1.3, 1), sf = ST[i] * 9.73;
    let g = clamp((cur.grow - 0.25 * r - 0.2 * (sf - Math.floor(sf))) / 0.55, 0, 1); g = g * g * (3 - 2 * g);
    out[0] = x * g; out[1] = y * g; out[2] = z * g; _e = e; _g = g;
    return out;
  }
  const placeNet = (k, out) => placeAt(EIG[k], out);

  // a lit community's other kept ties (those not among the strongest three), up to COMCAP, then the picked meme's
  function fillExtra() {
    let e = NCROSS;
    if (cur.com >= 0 && cur.com < CMEM.length) {
      const c = cur.com;
      for (const a of CMEM[c]) {
        const nb = MDATA.nb(a);
        for (let s = 0; s < nb.length && e < NCROSS + COMCAP; s++) { const b = nb[s]; if (b > a && COM[b] === c && !inMain(a, b)) putTie(LX, e++, a, b, 2); }
        if (e >= NCROSS + COMCAP) break;
      }
    }
    if (cur.pick >= 0) { const nb = MDATA.nb(cur.pick); for (let s = 0; s < nb.length && e < XCAP; s++) putTie(LX, e++, cur.pick, nb[s], 3); }
    if (e > NCROSS) touch(LX, NCROSS, e - NCROSS);
    xUsed = e; LX.g.setDrawRange(0, 2 * xUsed);
  }
  function setPick(p) {
    if (cur.pick >= 0) { PH[EIG[cur.pick]] = 0; for (const j of MDATA.nb(cur.pick)) PH[EIG[j]] = 0; }
    cur.pick = p;
    if (p >= 0) { for (const j of MDATA.nb(p)) PH[EIG[j]] = 1; PH[EIG[p]] = 2; }
    aPH.needsUpdate = true;
    U.uPickA.value = p >= 0 ? clamp(0.6 * Math.sqrt(12 / Math.max(1, MDATA.nb(p).length)), 0.1, 0.6) : 0.3;
    fillExtra();
  }

  // ---------------------------------------------------------------- the eye (the engine's camera or head, set's frame)
  // its place and the way it looks: from the camera that draws the points (each eye of a headset too); api().eye sets the
  // place for frames before that
  const EYE = [FRONT[0] * 4.6, FRONT[1] * 4.6, FRONT[2] * 4.6], LOOK = [-FRONT[0], -FRONT[1], -FRONT[2]];
  const _mi = new THREE.Matrix4(), _cp = new THREE.Vector3(), _cd = new THREE.Vector3();
  points.onBeforeRender = (r, sc, camera) => {
    _mi.copy(set.group.matrixWorld).invert();
    _cp.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(_mi);
    EYE[0] = _cp.x; EYE[1] = _cp.y; EYE[2] = _cp.z;
    camera.getWorldDirection(_cd).transformDirection(_mi);
    LOOK[0] = _cd.x; LOOK[1] = _cd.y; LOOK[2] = _cd.z;
  };
  const _p = [0, 0, 0], _q = [0, 0, 0];
  const distEye = p => Math.hypot(p[0] - EYE[0], p[1] - EYE[1], p[2] - EYE[2]);

  // ---------------------------------------------------------------- which tags show (at most a few, in view, apart)
  // candidates' directions from the eye; the best scored in view first, skipping one within sep of a tag already shown
  // (res: a tag's place already taken, or null)
  function chooseTags(N, posOf, score, VIS, maxN, sepCos, DIR, res) {
    let rx = 0, ry = 0, rz = 0;
    if (res) { rx = res[0] - EYE[0]; ry = res[1] - EYE[1]; rz = res[2] - EYE[2]; const l = Math.hypot(rx, ry, rz) || 1; rx /= l; ry /= l; rz /= l; }
    for (let k = 0; k < N; k++) {
      posOf(k, _q);
      const x = _q[0] - EYE[0], y = _q[1] - EYE[1], z = _q[2] - EYE[2], l = Math.hypot(x, y, z) || 1;
      DIR[3 * k] = x / l; DIR[3 * k + 1] = y / l; DIR[3 * k + 2] = z / l;
    }
    VIS.fill(0);
    for (let c = 0; c < maxN; c++) {
      let best = -1, bs = -1e9;
      for (let k = 0; k < N; k++) {
        if (VIS[k]) continue;
        const f = DIR[3 * k] * LOOK[0] + DIR[3 * k + 1] * LOOK[1] + DIR[3 * k + 2] * LOOK[2];
        if (f < 0.86) continue;   // (within about 30 degrees of the line of sight)
        const s = score(k, f);
        if (s <= bs) continue;
        let clear = !res || DIR[3 * k] * rx + DIR[3 * k + 1] * ry + DIR[3 * k + 2] * rz <= sepCos;
        for (let j = 0; j < N && clear; j++) if (VIS[j] && DIR[3 * k] * DIR[3 * j] + DIR[3 * k + 1] * DIR[3 * j + 1] + DIR[3 * k + 2] * DIR[3 * j + 2] > sepCos) clear = false;
        if (clear) { best = k; bs = s; }
      }
      if (best < 0) break;
      VIS[best] = 1;
    }
  }
  const CVIS = new Float32Array(NAMED), CDIR = new Float32Array(3 * NAMED);
  const comPos = (k, o) => { const c = COMS[k].centre; o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; return o; };
  const comScore = (k, f) => Math.log(COMS[k].n) + 4 * f;
  const NCORE = CORE.length, KVIS = new Float32Array(NCORE), KDIR = new Float32Array(3 * NCORE);
  const corePos = (j, o) => placeNet(CORE[j], o);
  const coreScore = (j, f) => -0.08 * j + 3 * f;   // (most viewed first)

  // ---------------------------------------------------------------- update
  function update(S, t) {
    PK.now++;   // (the pick's cache is a frame's)
    cur.L = clamp(S.cloud_layout, 0, 1); cur.grow = clamp(S.cloud_grow, 0, 1);
    cur.alone = clamp(S.cloud_alone, 0, 1); cur.comCol = clamp(S.cloud_comCol, 0, 1);
    cur.shell = clamp(S.cloud_shell, 0, 1); cur.commons = clamp(S.cloud_commons, 0, 1);
    cur.cross = clamp(S.cloud_cross, 0, 1); cur.core = clamp(S.cloud_core, 0, 1);
    const pk = S.cloud_pick >= -0.5 ? Math.round(S.cloud_pick) : -1, pv = pk >= 0 && pk < m ? pk : -1;
    const cm = S.cloud_com >= -0.5 ? Math.round(S.cloud_com) : -1, cv = cm >= 0 && cm < COMS.length ? cm : -1;
    if (cv !== cur.com) { cur.com = cv; if (pv === cur.pick) fillExtra(); }
    if (pv !== cur.pick) setPick(pv);
    const lay = prog(cur.L, 0.6, 1);   // (what belongs to the network shows once it has arrived)
    U.uL.value = cur.L; U.uGrow.value = cur.grow; U.uAlone.value = cur.alone; U.uLinks.value = clamp(S.cloud_links, 0, 1);
    U.uComCol.value = cur.comCol; U.uShell.value = cur.shell * lay; U.uCommons.value = cur.commons * lay; U.uCross.value = cur.cross;
    U.uPulse.value = clamp(S.cloud_pulse || 0, 0, 1); U.uCore.value = cur.core * lay; U.uCom.value = cv; U.uPickOn.value = pv >= 0 ? 1 : 0;
    // which tags show
    if (cur.comCol > 0.003 && lay > 0.003) chooseTags(NAMED, comPos, comScore, CVIS, 6, 0.9925, CDIR);
    // (the classics' names: up to five round you inside the commons; from outside it they crowd into a few degrees,
    // so one, clear of the commons' own tag)
    if (cur.core > 0.003 && lay > 0.003) {
      const inside = Math.hypot(EYE[0] - COMMONS[0], EYE[1] - COMMONS[1], EYE[2] - COMMONS[2]) < 0.6;
      chooseTags(NCORE, corePos, coreScore, KVIS, inside ? 5 : 1, 0.995, KDIR, cur.commons > 0.003 ? anchors.commonsTag() : null);
    }

    halos.begin();
    // the classics: small gold glows
    if (cur.core * lay > 0.003) for (let j = 0; j < NCORE; j++) { placeNet(CORE[j], _p); halos.add(_p, clamp(0.03 * distEye(_p), 0.012, 0.06), RGB.commons, 0.55 * cur.core * lay * _g); }
    // the commons: one soft gold glow at its middle, seen from outside it
    if (cur.commons * lay > 0.003) { const d = distEye(COMMONS); if (d > 0.7) halos.add(COMMONS, 0.75, RGB.commons, 0.1 * cur.commons * lay * prog(d, 0.7, 1.4)); }
    // a lit community: a soft glow at its centre
    if (cv >= 0) halos.add(COMS[cv].centre, 0.35, MLOOK.com(cv, _q), 0.18 * lay);
    if (pv >= 0) { placeNet(pv, _p); halos.add(_p, clamp(0.05 * distEye(_p), 0.02, 0.09), RGB.pick, 0.75 * _g); }
    halos.end();
    rings.begin();
    if (pv >= 0) {
      placeNet(pv, _p);
      const d = distEye(_p), Rr = clamp(0.028 * d, 0.01, 0.1);
      _q[0] = EYE[0] - _p[0]; _q[1] = EYE[1] - _p[1]; _q[2] = EYE[2] - _p[2];
      rings.add(_p, _q, Rr, Rr * 0.07, RGB.pick, 0.9 * _g);
    }
    rings.end();
    mainLines.visible = U.uLinks.value > 0.003 && cur.L > 0.3;
    xLines.visible = cur.L > 0.3 && (cur.cross > 0.003 || xUsed > NCROSS);
    LK.depth();
  }

  // ---------------------------------------------------------------- anchors (functions follow the moving points)
  const own = f => { const o = [0, 0, 0]; return () => f(o); };
  // the meme of a set whose place (in a layout L, 3 per meme, by archive index) is nearest a point
  const nearest = (L, pt, ok, N) => {
    let best = -1, bd = 1e9;
    for (let i = 0; i < N; i++) if (ok(i)) { const d = (L[3 * i] - pt[0]) ** 2 + (L[3 * i + 1] - pt[1]) ** 2 + (L[3 * i + 2] - pt[2]) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
  };
  // the commons' middle (the mean of the inner 10 % in the network's layout)
  const COMMONS = [0, 0, 0];
  { let c = 0; for (let k = 0; k < m; k++) if (BAND[k] === 0) { c++; for (let a = 0; a < 3; a++) COMMONS[a] += MDATA.net[3 * k + a]; } for (let a = 0; a < 3; a++) COMMONS[a] /= c || 1; }
  // tags' memes: a shell meme towards the default view (front, a little up), a commons meme just above its middle, a lonely
  // meme of the archive on the front side
  const SHELL_K = nearest(MDATA.net, [1.05 * (FRONT[0] + 0.25), 1.05 * (FRONT[1] + 0.3), 1.05 * FRONT[2]].map((v, a, s) => v / Math.hypot(...s) * 1.15), k => BAND[k] === 4, m);
  const COMM_K = nearest(MDATA.net, [COMMONS[0], COMMONS[1] + 0.16, COMMONS[2] + 0.06], k => BAND[k] === 0, m);
  let ALONE_I = -1;
  { let bs = -1e9; for (let i = 0; i < n; i++) if (aloneOf(i)) { const x = PA[3 * i], y = PA[3 * i + 1], z = PA[3 * i + 2], r = Math.hypot(x, y, z); if (r > 1.25) continue; const s = (x * FRONT[0] + y * FRONT[1] + z * FRONT[2]) + 0.4 * y; if (s > bs) { bs = s; ALONE_I = i; } } }
  if (ALONE_I < 0) ALONE_I = 0;
  const anchors = {
    centre: [0, 0, 0], top: [0, 1.32, 0], commons: COMMONS.slice(),
    shell: own(o => placeNet(SHELL_K, o)), commonsTag: own(o => placeNet(COMM_K, o)), alone: own(o => placeAt(ALONE_I, o)),
    pick: own(o => placeNet(cur.pick >= 0 ? cur.pick : CORE[0], o)),
    // just under the picked meme, steady on screen (its second tag)
    pickTag: own(o => { placeNet(cur.pick >= 0 ? cur.pick : CORE[0], o); o[1] -= 0.045 * distEye(o); return o; }),
    // the lit community's centre
    comLit: own(o => comPos(cur.com >= 0 ? cur.com : 0, o)),
    com: k => (COMS[k] ? COMS[k].centre.slice() : [0, 0, 0]),
    meme: k => placeNet(k >= 0 && k < m ? k : CORE[0], [0, 0, 0]),
  };
  for (let k = 0; k < NAMED; k++) anchors['com' + k] = COMS[k].centre.slice();
  CORE.forEach((k, j) => { anchors['core' + j] = own(o => placeNet(k, o)); });

  // ---------------------------------------------------------------- labels (the set's own, by its params)
  const B = H.bands, BANDWORD = ['the commons', 'inner quarter', 'the middle', 'outer quarter', 'the niches'];
  const NM = k => MDATA.name(EIG[k]);
  const pickTxt = { k: -2, a: ['', ''], b: ['', ''] };
  const pickTexts = () => {
    if (pickTxt.k !== cur.pick) {
      const k = cur.pick; pickTxt.k = k;
      if (k >= 0 && NM(k)) {
        const tg = MDATA.tags(k).slice(0, 2);
        pickTxt.a = [NM(k), tg.length ? ' · ' + tg.join(', ') : ''];
        pickTxt.b = [`${comName(COM[k])}, ${BANDWORD[BAND[k]]}`, ` · ${pct(MDATA.foreign(k))} of its ties leave`];
      } else { pickTxt.a = ['', '']; pickTxt.b = ['', '']; }
    }
  };
  const lay = S => prog(S.cloud_layout, 0.7, 1);
  const comTxt = { k: -2, t: ['', ''] };
  const named = () => cur.pick >= 0 && !!NM(cur.pick);
  const labels = [
    { text: [fmt(MDATA.jcAlone), ' with no link'], at: 'alone', cls: '', alpha: S => prog(S.cloud_alone, 0.3, 0.8) * (1 - prog(S.cloud_layout, 0, 0.3)) },
    { text: ['The niches', ` · ${pct(B.outer10.foreign)} of their ties leave their group`], at: 'shell', cls: '', alpha: S => prog(S.cloud_shell, 0.3, 0.8) * lay(S) },
    { text: ['The commons', ` · ${share(B.inner10.foreign)} of their ties reach other groups`], at: 'commonsTag', cls: MLOOK.CLS.commons, alpha: S => prog(S.cloud_commons, 0.3, 0.8) * lay(S) },
    ...COMS.slice(0, NAMED).map((c, k) => ({ text: [comName(k), c.tags.length ? ' · ' + c.tags.slice(0, 2).join(', ') : ''], at: 'com' + k, cls: '',
      alpha: S => prog(S.cloud_comCol, 0.3, 0.8) * lay(S) * CVIS[k] * (S.cloud_com >= -0.5 ? 0 : 1) })),
    { text: () => { if (comTxt.k !== cur.com) { const k = cur.com; comTxt.k = k; comTxt.t = k >= 0 ? [comName(k), ` · ${fmt(COMS[k].n)} memes`] : ['', '']; } return comTxt.t; }, at: 'comLit', cls: '', alpha: S => (S.cloud_com >= -0.5 ? lay(S) : 0) },
    ...CORE.map((k, j) => ({ text: [NM(k), ''], at: 'core' + j, cls: MLOOK.CLS.commons, minor: j > 3,
      alpha: S => prog(S.cloud_core, 0.3, 0.8) * lay(S) * KVIS[j] * (k === cur.pick ? 0 : 1) })),
    { text: () => { pickTexts(); return pickTxt.a; }, at: 'pick', cls: MLOOK.CLS.pick, alpha: S => (S.cloud_pick >= -0.5 && named() ? 1 : 0) },
    { text: () => { pickTexts(); return pickTxt.b; }, at: 'pickTag', cls: '', minor: true, alpha: S => (S.cloud_pick >= -0.5 && named() ? lay(S) : 0) },
  ];

  // ---------------------------------------------------------------- views
  const r1 = v => Math.round(v * 1000) / 1000;
  const cam = {
    default: [AZ, EL, 4.6, 0, 0, 0],
    side: [AZ + 90, 8, 4.6, 0, 0, 0],
    // into the shell: 1.1 from its surface on the front side, looking in
    close: [AZ + 6, EL - 2, 1.15, r1(FRONT[0] * 0.95), r1(FRONT[1] * 0.95), r1(FRONT[2] * 0.95)],
    // from the centre: the camera at the origin (the target 0.35 out, the view 0.35 back), looking out towards the side
    // the default view sees from
    inside: [AZ + 180, -EL, 0.35, r1(0.35 * FRONT[0]), r1(0.35 * FRONT[1]), r1(0.35 * FRONT[2])],
    above: [AZ, 72, 5, 0, 0, 0],
    // (the commons from just outside it)
    commons: [AZ, EL, 1.6, r1(COMMONS[0]), r1(COMMONS[1]), r1(COMMONS[2])],
  };

  // ---------------------------------------------------------------- explore
  const controls = [
    { key: 'layout', label: 'Layout', options: [['network', 'Tag network'], ['archive', 'Archive']] },
    { key: 'links', label: 'Ties', options: [['on', 'On'], ['off', 'Off']] },
    { key: 'colour', label: 'Colour', options: [['groups', 'Groups'], ['plain', 'Plain']] },
    { key: 'look', label: 'Show', options: [['all', 'Everything'], ['shell', 'The niches'], ['commons', 'The commons']] },
  ];
  const explore = c => {
    const net = c.layout !== 'archive', look = net ? c.look : 'all';
    return { cloud_layout: net ? 1 : 0, cloud_alone: net ? 0 : 1, cloud_links: c.links === 'off' ? 0 : 1, cloud_comCol: c.colour === 'plain' ? 0 : 1,
      cloud_shell: look === 'shell' ? 1 : 0, cloud_commons: look === 'commons' ? 1 : 0, cloud_cross: look === 'commons' ? 1 : 0, cloud_core: look === 'commons' ? 1 : 0 };
  };

  // ---------------------------------------------------------------- picking and api()
  const _inv = new THREE.Matrix4(), _ray = new THREE.Ray();
  // a ray in world coordinates (a THREE.Raycaster, a THREE.Ray, or { origin, direction } as vectors or arrays) to the named
  // meme of the network nearest it within a small angle that is shown; -1 none. (Unnamed and flagged memes are never
  // picked: they are never labelled.)
  const PK = { frame: -1, now: 0, p: new Float32Array(3 * m), g: new Float32Array(m), ok: new Uint8Array(m) };
  for (let k = 0; k < m; k++) PK.ok[k] = NM(k) ? 1 : 0;
  function pick(rc) {
    if (!rc || set.uA.value < 0.3 || !set.group.visible) return -1;
    const r = rc.ray || rc, o = r.origin, d = r.direction;
    if (!o || !d) return -1;
    const v3 = v => (Array.isArray(v) ? v : [v.x, v.y, v.z]);
    _ray.origin.fromArray(v3(o)); _ray.direction.fromArray(v3(d)).normalize();
    set.group.updateMatrixWorld();
    _ray.applyMatrix4(_inv.copy(set.group.matrixWorld).invert());
    const ox = _ray.origin.x, oy = _ray.origin.y, oz = _ray.origin.z, dx = _ray.direction.x, dy = _ray.direction.y, dz = _ray.direction.z;
    // (every meme's place once a frame, however many rays ask: a headset points two every frame)
    if (PK.frame !== PK.now) { PK.frame = PK.now; for (let k = 0; k < m; k++) { placeNet(k, _q); PK.p[3 * k] = _q[0]; PK.p[3 * k + 1] = _q[1]; PK.p[3 * k + 2] = _q[2]; PK.g[k] = _g; } }
    const dimmed = cur.com >= 0;
    let best = -1, bs = 1;
    for (let k = 0; k < m; k++) {
      if (!PK.ok[k] || PK.g[k] < 0.5 || (dimmed && COM[k] !== cur.com)) continue;
      const x = PK.p[3 * k] - ox, y = PK.p[3 * k + 1] - oy, z = PK.p[3 * k + 2] - oz, along = x * dx + y * dy + z * dz;
      if (along <= 0.02) continue;
      const off = Math.sqrt(Math.max(0, x * x + y * y + z * z - along * along)), tol = 0.005 + 0.01 * along;
      if (off > tol) continue;
      const s = off / tol + along * 0.02;
      if (s < bs) { bs = s; best = k; }
    }
    return best;
  }
  const API = {
    n, m, pick,
    pos: (k, out) => placeNet(k >= 0 && k < m ? k : CORE[0], out || [0, 0, 0]),
    // an archive meme's place now (for the archive layout's own uses)
    posArchive: (i, out) => placeAt(i >= 0 && i < n ? i : 0, out || [0, 0, 0]),
    eye: (x, y, z) => { EYE[0] = x; EYE[1] = y; EYE[2] = z; },
    // how near the eyes nothing is drawn, in the world's units (the engine: 0.35 in a headset, metres; 0 on a screen)
    near: v => { U.uNear.value = Math.max(0, +v || 0); },
    comName, named: NAMED, bandWord: b => BANDWORD[b] || '',
  };

  setPick(-1);
  return Object.assign(set, {
    params: { cloud_a: 1, cloud_layout: 0, cloud_grow: 1, cloud_alone: 0, cloud_links: 0, cloud_comCol: 0, cloud_shell: 0,
      cloud_commons: 0, cloud_cross: 0, cloud_pulse: 0, cloud_core: 0, cloud_pick: -1, cloud_com: -1 },
    update, anchors, labels, cam, controls, explore, api: () => API,
  });
};
