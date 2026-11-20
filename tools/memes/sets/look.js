// MLOOK: the memes story's palette (SPEC.md, "Look"), after the authors' notebooks (VR_scenes/*_MEMES_scenes.ipynb):
// their memes glow pale cyan (170 255 255), their links blue (0 171 255) or grey (66 66 66), their topic clusters take an
// hsv palette, their year spheres YlOrRd. Plain constants and small functions: colours as '#rrggbb' and [r, g, b] 0..1.
const MLOOK = (() => {
  const rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const hsv = (h, s, v) => { const f = k => { const x = (k + h * 6) % 6; return v - v * s * Math.max(0, Math.min(x, 4 - x, 1)); }; return [f(5), f(3), f(1)]; };
  const C = {
    meme: '#aaffff',      // a meme, the authors' pale cyan
    link: '#00abff',      // links, the authors' blue
    linkGrey: '#424242',  // links, the authors' grey
    alone: '#5a6878',     // archive memes with no link (11,906): faint
    commons: '#ffd36b',   // the inner 10 % (the commons): warm gold, the story's own highlight
    shell: '#7fa3c8',     // the outer shell's niches when shown as a whole: cool
    cross: '#ffb43b',     // a crossroads meme's links to other communities (amber)
    pick: '#46d9ff',      // the app's cyan: a picked meme
    hot: '#ff5ad9',       // a year snapshot's hot topic rising (magenta)
    year: '#ffb347',      // a year snapshot's memes (YlOrRd's middle)
  };
  const RGB = {}; for (const k in C) RGB[k] = rgb(C[k]);
  // the communities (0..26, by size): the authors' hsv palette, spread so that neighbours in size differ; the eight tiny
  // ones (fewer than ten memes) grey
  const com = (k, out) => {
    const o = out || [0, 0, 0];
    if (k >= 19 || k === 255) { o[0] = o[1] = o[2] = 0.45; return o; }
    const c = hsv(((k * 7) % 19) / 19, 0.62, 1.0); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; return o;
  };
  const comHex = k => '#' + com(k).map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  const CLS = { commons: 'amb', pick: 'cyn', hot: 'mag', cross: 'amb' };
  return { rgb, C, RGB, com, comHex, CLS };
})();
