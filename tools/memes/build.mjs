// Assembles stories/memes.js from the tour's kit (tools/lbi/kit.js), the data (sets/data.js, written by
// data/gen_data.py from the Menche lab's Memes_Data repository), its decoders (sets/mdata.js), the story's palette
// (sets/look.js), the tissue topology story's look (tools/topo/sets/look.js, unchanged), the sets and the engine parts in
// this folder.
// usage (from the repository root): node tools/memes/build.mjs        -> writes stories/memes.js
//                                   node tools/memes/build.mjs --check -> exits 1 if stories/memes.js is out of date
// Check the data and its decoders first with node tools/memes/test-data.mjs.
import fs from 'fs';
import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname), root = path.join(here, '../..');
const read = f => fs.readFileSync(path.join(here, f), 'utf8');
// the data, its decoders and the looks first, then the sets in the order the story uses them
const SET_FILES = ['sets/data', 'sets/mdata', 'sets/look', '../topo/sets/look', 'sets/cloud', 'sets/year'];
const ENGINE = ['e2_scene', 'e3_story', 'e4_explore', 'e5_xr', 'e6_panels', 'e7_app'];
let kit = read('../lbi/kit.js')
  .replace("if (typeof module !== 'undefined') module.exports = { makeKit };\n", '')
  .replace(/^(\/\/.*\n)+/, '// Shared helpers for the 3D sets (the tour\'s kit): makeKit(THREE) returns K.\n');
// (the decoders' Node export goes: in the story they are a plain constant inside the closure)
const sets = SET_FILES.map(f => read(`${f}.js`).replace("if (typeof module !== 'undefined') module.exports = MDATA;\n", '').trimEnd() + '\n\n').join('');
let out = read('engine/e1_head.js').replace('//@@KIT@@\n', () => kit).replace('//@@SETS@@\n', () => sets);
for (const f of ENGINE) out += read(`engine/${f}.js`);
const target = path.join(root, 'stories/memes.js');
if (process.argv.includes('--check')) {
  const same = fs.existsSync(target) && fs.readFileSync(target, 'utf8') === out;
  console.log(same ? 'stories/memes.js is up to date' : 'stories/memes.js is out of date: run node tools/memes/build.mjs');
  process.exit(same ? 0 : 1);
}
fs.writeFileSync(target, out);
console.log(`wrote stories/memes.js (${(out.length / 1024).toFixed(0)} KB)`);
