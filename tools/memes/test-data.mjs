// Checks MEMES_DATA (sets/data.js) and its decoders (sets/mdata.js) against the repository's numbers and the
// generator's. A second, no browser. usage (from the repository root): node tools/memes/test-data.mjs
import fs from 'fs';
import vm from 'vm';
import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname);
const ctx = { Buffer, module: undefined };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here, 'sets/data.js'), 'utf8') + '\nthis.MEMES_DATA = MEMES_DATA;', ctx);
vm.runInContext(fs.readFileSync(path.join(here, 'sets/mdata.js'), 'utf8') + '\nthis.MDATA = MDATA;', ctx);
const C = ctx.MDATA;
let bad = 0;
const ok = (c, what) => { if (!c) { bad++; console.log('FAIL', what); } };
const t0 = Date.now();
ok(C.n === 29610 && C.m === 17243, 'the archive 29,610 memes, the tag network 17,243');
ok(C.netLinks === 387453 && C.jcLinks === 387720, 'the tag network\'s 387,453 links, the archive layout\'s 387,720');
let s = 0; for (let k = 0; k < C.m; k++) s += C.nb(k).length;
ok(s === 2 * C.kept && C.kept > 100000, `kept links decoded both ways (${C.kept})`);
ok(C.archive.length === 3 * C.n && C.net.length === 3 * C.m && C.archive.every(Number.isFinite) && C.net.every(Number.isFinite), 'both layouts decoded');
const r90 = X => { const r = []; for (let i = 0; i < X.length; i += 3) r.push(Math.hypot(X[i], X[i + 1], X[i + 2])); r.sort((a, b) => a - b); return r[Math.floor(0.9 * r.length)]; };
ok(Math.abs(r90(C.archive) - 1.2) < 0.02 && Math.abs(r90(C.net) - 1.2) < 0.02, '90 % within radius 1.2 in both frames');
const doge = C.find('Doge'), k = C.netOf(doge);
ok(doge >= 0 && k >= 0 && C.band(k) === 0 && C.hyp.core.includes(k), 'Doge: named, in the tag network, in the inner 10 %, a core example');
ok(C.coms.length === 27 && C.coms[0].tags.includes('music'), '27 communities, the largest music');
let named = 0; for (let i = 0; i < C.n; i++) if (C.name(i)) named++;
ok(named > 17000 && named < 19000, `named memes (${named})`);
ok(C.flagged > 800 && !C.name(C.find('Lemon Party')) && C.find('Lemon Party') === -1, 'flagged memes carry no name');
ok(C.subs.length === 3 && C.subs.every(x => x.idx.length === x.n && x.xy.length === 2 * x.n && x.hotOf.length === x.n), 'the three snapshots');
ok(C.subs[0].year === 2020 && C.subs[1].year === 2019 && C.subs[0].hot.includes('trump'), 'their years and hot topics');
const h = C.hyp;
ok(h.rhoForeign < -0.3 && Math.abs(h.rhoViews) < 0.05 && h.seeds.every(x => x.rho < -0.3), 'the hypothesis\' numbers: crossing, not views, and robust to the community split');
ok(h.bands.inner10.foreign > 0.3 && h.bands.outer10.foreign < 0.05, 'inner a third foreign, outer a few percent');
ok(C.search('cat', 5).length === 5 && C.tags(k).length > 0, 'search and tags');
{ let a = 0; for (let i = 0; i < C.n; i++) a += C.alone(i); ok(a === C.jcAlone, `alone(i) marks the ${C.jcAlone} memes with no link in the archive (${a})`); }
console.log(bad ? `${bad} failed` : 'all good', `(${Date.now() - t0} ms)`);
process.exit(bad ? 1 : 0);
