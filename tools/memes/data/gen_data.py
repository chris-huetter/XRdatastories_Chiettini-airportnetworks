#!/usr/bin/env python3
# Writes tools/memes/sets/data.js (MEMES_DATA) for the memes story from the Menche lab's Memes_Data repository
# (https://github.com/menchelab/Memes_Data, Christiane Hütter; source: knowyourmeme.com, scraped 2022-2023). The
# repository is kept out of this one: only the numbers and names below go in, never an image.
#
# usage (from the repository root): python3 -I tools/memes/data/gen_data.py <folder of the Memes_Data clone>
#   then node tools/memes/test-data.mjs and node tools/memes/build.mjs
# Needs numpy, scipy, scikit-learn and networkx. Deterministic (Louvain with seed 1, fixed random views). About a minute.
#
# What the repository holds and what this takes (all layouts are the authors'; nothing is laid out again here):
# - data/nodesALL.json: 29,610 memes (name, views, year, tags, categories; image links not used);
# - data/posG_jc_3D_nn-8_md-0.2.csv: the 29,610 memes in 3D by the Jaccard similarity of their tags (UMAP, 8 neighbours,
#   min dist 0.2), in nodesALL's order; data/edges_jc_3D_nn-8_md-0.2.csv its 387,720 links (the UMAP's neighbour graph);
# - data/Memes_felix-eigen-3D_nn10_md0.json: 17,243 memes in 3D (an eigenvector layout, 10 neighbours) with 387,453
#   links weighted by shared tags (one connected network);
# - subgraphs/<politics|screens|socialmedia>/subnetwork_Cmod_*.json: three one-year snapshots (all memes of 2020, 2019,
#   2020), 2D layouts, each with its year's hot topic marked (subset: politics, trump, election; television, netflix...;
#   tiktok, twitter, youtube...).
# What this computes itself (documented in the output): the tag network's communities (Louvain, weighted, seed 1; checked
# against seeds 2 to 4), their names (their most over-represented tags), and the measures behind the story's hypothesis
# (each meme's distance from the tag map's centre, its share of links to other communities, how often it is hidden behind
# other memes from 80 outside views, and how well a 2D view's distance from the centre still tells core from shell).
# Content: memes whose tags or categories mark them pornographic, shock media, gore or racist, or whose names hold a crude
# word or a slur (FLAG_TAGS, FLAG_CATS, FLAG_NAME below), keep their
# place as a point but lose their name, tags and views: never labelled, never searchable, never an example.
import json, os, sys, base64, math, collections, csv
import numpy as np
import networkx as nx
from scipy.stats import spearmanr
from sklearn.metrics import roc_auc_score

SRC = sys.argv[1] if len(sys.argv) > 1 else None
if not SRC or not os.path.isfile(os.path.join(SRC, 'data', 'nodesALL.json')):
    sys.exit('usage: python3 -I tools/memes/data/gen_data.py <folder of the Memes_Data clone>')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'sets', 'data.js')
P = lambda *a: os.path.join(SRC, *a)
FLAG_TAGS = {'nsfw', 'porn', 'pornography', 'hentai', 'gore', 'shock site', 'shock sites', 'sex', 'sexual', 'fetish',
             'nudity', 'nude', 'rule 34', 'racism', 'racist', 'slur', 'nazi', 'genitals', 'penis', 'vagina', 'scat', 'feces',
             'shock media', 'shock video', 'pedophilia', 'loli'}
FLAG_CATS = {'fetish', 'shock-media'}
# names that are crude or slurs (whole words, any case) are flagged too, whatever their tags say
import re
FLAG_NAME = re.compile(r"\b(bitch\w*|cum|cock\w*|dick\w*|pussy|fuck\w*|shit\w*|sex\w*|porn\w*|rape\w*|nigg\w*|fag\w*|retard\w*|tranny|nazi\w*|hitler|yaranaika|hentai|nude\w*|naked|boob\w*|tits?|titty|penis|vagina|anal|orgasm\w*|masturbat\w*|jizz|semen|whore|slut\w*|cuck\w*|incest|pedo\w*|loli\w*|gore|scat)\b", re.I)

def b64(a): return base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
def vlist(nums):
    out = bytearray()
    for v in nums:
        v = int(v)
        while True:
            b = v & 127; v >>= 7
            out.append(b | (128 if v else 0))
            if not v: break
    return out

# ---------------------------------------------------------------------------------------------------- the memes -----
A = json.load(open(P('data', 'nodesALL.json'), encoding='utf-8'))
N = len(A); assert N == 29610
flag = np.array([bool(set(t.lower() for t in x.get('tags', [])) & FLAG_TAGS or set(x.get('cat', [])) & FLAG_CATS or FLAG_NAME.search(x['name'])) for x in A])
year = np.array([x.get('year') or 0 for x in A]); year = np.where((year >= 1990) & (year <= 2023), year, 0)
views = np.array([x.get('views') or 0 for x in A], float)
byname = {}
for i, x in enumerate(A): byname.setdefault(x['name'], i)

# the full archive by tag similarity (the jc layout)
J = np.array([[float(v) for v in r] for r in list(csv.reader(open(P('data', 'posG_jc_3D_nn-8_md-0.2.csv'))))[1:]])
assert J.shape == (N, 3)
JE = np.array([[int(v) for v in r] for r in list(csv.reader(open(P('data', 'edges_jc_3D_nn-8_md-0.2.csv'))))[1:]])
GJ = nx.Graph(); GJ.add_nodes_from(range(N)); GJ.add_edges_from(map(tuple, JE))
jdeg = np.array([GJ.degree(i) for i in range(N)])
jcomp = nx.number_connected_components(GJ); jalone = int((jdeg == 0).sum())

# the tag network (the eigen layout): 17,243 memes, weighted links
F = json.load(open(P('data', 'Memes_felix-eigen-3D_nn10_md0.json'), encoding='utf-8'))
E = [byname[n['id']] for n in F['nodes']]          # eigen index -> archive index
M = len(E); emap = {n['id']: k for k, n in enumerate(F['nodes'])}
EP = np.array([n['pos'] for n in F['nodes']])
G = nx.Graph(); G.add_nodes_from(range(M))
for l in F['links']: G.add_edge(emap[l['source']], emap[l['target']], weight=int(l['weight']))
assert nx.number_connected_components(G) == 1
com = sorted(nx.algorithms.community.louvain_communities(G, weight='weight', seed=1), key=len, reverse=True)
cid = np.zeros(M, int)
for k, c in enumerate(com):
    for i in c: cid[i] = k
tags_e = [set(t.lower() for t in A[E[k]].get('tags', [])) for k in range(M)]
glob = collections.Counter(t for s in tags_e for t in s)
STOP = {'meme', 'memes', 'mème', 'funny', 'lol', 'to', 'i', 'is', 'of', 'the', 'a', 'and', 'video', 'image', 'images'}
def com_tags(c, n=4):
    cnt = collections.Counter(t for i in c for t in tags_e[i])
    sc = sorted((((cnt[t] / len(c)) / (glob[t] / M)), t) for t in cnt if cnt[t] >= max(8, len(c) * 0.04) and t not in STOP and t not in FLAG_TAGS)
    return [t for _, t in sc[::-1][:n]]

# --------------------------------------------------------------------------------------- the frames (story units) -----
def frame(X, q=0.9, R=1.2):
    c = np.median(X, 0); r = np.linalg.norm(X - c, axis=1); s = R / np.quantile(r, q)
    return (X - c) * s, s
JX, js = frame(J)
EX, es = frame(EP)
def q16(X, lim):   # story-frame coordinates as 16 bits over [-lim, lim]
    return np.round((np.clip(X, -lim, lim) / lim * 0.5 + 0.5) * 65535).astype('<u2')
JLIM = float(np.ceil(np.abs(JX).max() * 10) / 10); ELIM = float(np.ceil(np.abs(EX).max() * 10) / 10)

# ------------------------------------------------------------------------------------------- the hypothesis -----
r = np.linalg.norm(EX, axis=1)
deg = np.array([G.degree(i) for i in range(M)])
foreign = np.array([np.mean([cid[j] != cid[i] for j in G[i]]) for i in range(M)])
ncoms = np.array([len(set(cid[j] for j in G[i])) for i in range(M)])
qs = np.quantile(r, [0.1, 0.25, 0.75, 0.9])
inner = r < qs[0]; outer = r > qs[3]; shell = r > qs[2]
evw = views[E]; eyr = year[E]
rho = lambda a, b: float(spearmanr(a, b).correlation)
seeds = []
for sd in (2, 3, 4):
    cm = nx.algorithms.community.louvain_communities(G, weight='weight', seed=sd); cd = np.zeros(M, int)
    for k, c in enumerate(cm):
        for i in c: cd[i] = k
    fr = np.array([np.mean([cd[j] != cd[i] for j in G[i]]) for i in range(M)])
    seeds.append({'seed': sd, 'communities': len(cm), 'rho': round(rho(r, fr), 3), 'inner': round(float(np.median(fr[inner])), 3), 'outer': round(float(np.median(fr[outer])), 3)})
rng = np.random.default_rng(0); hidI, hidS, aucs = [], [], []
for _ in range(80):
    d = rng.normal(size=3); d /= np.linalg.norm(d); u = np.cross(d, [0.3, 1, 0.2]); u /= np.linalg.norm(u); v = np.cross(d, u)
    px, py, dep = EX @ u, EX @ v, EX @ d; sc = np.ptp(px) / 90
    key = np.floor(px / sc).astype(np.int64) * 100000 + np.floor(py / sc).astype(np.int64)
    def hidden(sel):
        o = ~sel; order = np.argsort(key[o]); ko = key[o][order]; do = dep[o][order]
        uk, st = np.unique(ko, return_index=True); front = dict(zip(uk, np.maximum.reduceat(do, st)))
        return float(np.mean([front.get(kk, -1e18) > dd for kk, dd in zip(key[sel], dep[sel])]))
    hidI.append(hidden(inner)); hidS.append(hidden(shell))
    r2 = np.linalg.norm(EX - np.outer(EX @ d, d), axis=1); m = inner | shell
    aucs.append(roc_auc_score(inner[m], -r2[m]))
def band(sel):
    return {'n': int(sel.sum()), 'views': float(np.median(evw[sel])), 'deg': float(np.median(deg[sel])),
            'foreign': round(float(np.median(foreign[sel])), 3), 'coms': float(np.median(ncoms[sel]))}
core_ex = [int(k) for k in np.argsort(-evw * inner) if inner[k] and not flag[E[k]]][:24]
shell_ex = [int(k) for k in np.argsort(-evw * outer) if outer[k] and not flag[E[k]]][:24]
hyp = {
    'rhoForeign': round(rho(r, foreign), 3), 'rhoViews': round(rho(r, np.log1p(evw)), 3), 'rhoDeg': round(rho(r, deg), 3),
    'rhoYear': round(rho(r[eyr > 0], eyr[eyr > 0]), 3), 'rhoComs': round(rho(r, ncoms), 3),
    'bands': {'inner10': band(inner), 'inner25': band((r >= qs[0]) & (r < qs[1])), 'middle': band((r >= qs[1]) & (r < qs[2])),
              'outer25': band((r >= qs[2]) & (r < qs[3])), 'outer10': band(outer)},
    'radii': [round(float(x), 3) for x in qs],
    'seeds': seeds,
    'hidden': {'inner': [round(min(hidI), 2), round(float(np.mean(hidI)), 2), round(max(hidI), 2)],
               'shell': [round(min(hidS), 2), round(float(np.mean(hidS)), 2), round(max(hidS), 2)]},
    'auc2d': [round(min(aucs), 3), round(float(np.mean(aucs)), 3), round(max(aucs), 3)],
    'core': core_ex, 'shellEx': shell_ex,
    'innerComs': [[int(k), int(v)] for k, v in collections.Counter(cid[inner]).most_common(8)],
    'method': "distance from the tag map's median centre; a meme's share of links to memes of other communities "
              "(Louvain, weighted, seed 1; seeds 2 to 4 alike); hidden: the share of a group's memes with another meme in "
              "front in the same cell of a 90-wide grid, over 80 random outside views; 2D: the area under the ROC curve "
              "of a view's distance from the centre telling the inner 10 % from the outer 25 %",
}

# ------------------------------------------------------------------------------------------- the subnetworks -----
subs = []
# each is one year's memes (the notebook's annual network) laid out in 2D, with the year's hot topic marked ('subset')
for key, title in (('politics', 'Politics'), ('screens', 'Screens: TV, film, streaming'), ('socialmedia', 'Social media')):
    d = json.load(open(P('subgraphs', key, f'subnetwork_Cmod_{key}.json'), encoding='utf-8'))
    idx = [byname[n['id']] for n in d['nodes']]
    xy = np.array([n['pos'] for n in d['nodes']], float); c = np.median(xy, 0); xy -= c
    xy *= 1.0 / np.quantile(np.linalg.norm(xy, axis=1), 0.95)
    pos = {n['id']: k for k, n in enumerate(d['nodes'])}
    ed = sorted({tuple(sorted((pos[e['source']], pos[e['target']]))) for e in d['edges']})
    yrs = year[idx]; ok = yrs > 0
    yc = collections.Counter(yrs[ok]).most_common(1)[0][0]
    hot = sorted({n['subset'] for n in d['nodes'] if n['subset'] != 'None'})
    hotIdx = [k for k, n in enumerate(d['nodes']) if n['subset'] != 'None']
    hotOf = [hot.index(n['subset']) + 1 if n['subset'] != 'None' else 0 for n in d['nodes']]
    subs.append({'key': key, 'title': title, 'n': len(idx), 'links': len(ed), 'idx': b64(np.array(idx, '<u2')),
                 'xy': b64(q16(xy, 1.6)), 'lim': 1.6, 'ij': b64(np.array(ed, '<u2').ravel()),
                 'year': int(yc), 'allOfYear': bool((yrs[ok] == yc).all()), 'hot': hot, 'hotOf': b64(np.array(hotOf, np.uint8)),
                 'hotN': [[h, sum(1 for x in hotOf if x == k + 1)] for k, h in enumerate(hot)]})

# ----------------------------------------------------------------------------------------- names, tags, adjacency -----
named = np.zeros(N, bool); named[E] = True
for s in subs:
    for i in np.frombuffer(base64.b64decode(s['idx']), '<u2'): named[i] = True
named &= ~flag
names = [A[i]['name'].replace('\t', ' ') if named[i] else '' for i in range(N)]
vocab = [t for t, n in glob.most_common() if t not in FLAG_TAGS and n >= 25][:1500]
vix = {t: k for k, t in enumerate(vocab)}
mtags = []
for k in range(M):
    tt = [vix[t] for t in sorted(tags_e[k], key=lambda t: glob[t]) if t in vix and not flag[E[k]]][:4]
    mtags.append(tt)
tbuf = bytearray()
for tt in mtags: tbuf += vlist([len(tt)] + tt)
# the links kept for drawing: each meme's 12 strongest (by shared tags; ties by index), both ways; the counts behind the
# story (degree, the share of links to other communities) are over every link and stored per meme
TOPK = 12
keep = set()
for i in range(M):
    for j in sorted(G[i], key=lambda j: (-G[i][j]['weight'], j))[:TOPK]: keep.add((min(i, j), max(i, j)))
up = collections.defaultdict(list)
for a, b in keep: up[a].append(b)
abuf = bytearray(); wbuf = bytearray()
for i in range(M):
    hi = sorted(up[i])
    abuf += vlist([len(hi)]); abuf += vlist([b - a for a, b in zip([i] + hi[:-1], hi)])
    wbuf += bytes(min(255, G[i][j]['weight']) for j in hi)
coms = [{'n': len(c), 'tags': com_tags(c), 'centre': [round(float(x), 3) for x in np.median(EX[sorted(c)], 0)]} for c in com]

D = {
    'about': "the Menche lab's Memes_Data repository (github.com/menchelab/Memes_Data, Christiane Hütter): 29,610 memes "
             "from knowyourmeme.com (2022-2023), their tags, the authors' two 3D layouts and three topic subnetworks",
    'n': N, 'm': M, 'names': '\t'.join(names), 'flagged': int(flag.sum()),
    'year': b64((np.where(year > 0, year - 1980, 0)).astype(np.uint8)),
    'views': b64(np.round(np.log10(1 + views) * 25).astype(np.uint8)),
    'jc': {'pos': b64(q16(JX, JLIM)), 'lim': JLIM, 'aloneBits': b64(np.packbits(jdeg == 0, bitorder='little')), 'links': int(GJ.number_of_edges()), 'components': int(jcomp), 'alone': jalone},
    'eig': {'idx': b64(np.array(E, '<u2')), 'pos': b64(q16(EX, ELIM)), 'lim': ELIM, 'links': int(G.number_of_edges()),
            'adj': base64.b64encode(bytes(abuf)).decode(), 'w': base64.b64encode(bytes(wbuf)).decode(), 'kept': len(keep), 'topk': TOPK,
            'deg': b64(deg.astype('<u2')), 'foreign': b64(np.round(foreign * 255).astype(np.uint8)),
            'com': b64(cid.astype(np.uint8)), 'tags': base64.b64encode(bytes(tbuf)).decode()},
    'vocab': '\t'.join(vocab), 'coms': coms, 'subs': subs, 'hyp': hyp,
    'facts': {'memes': N, 'linked': M, 'communities': len(com), 'years': [int(year[year > 0].min()), int(year[year > 0].max())],
              'flagged': int(flag.sum()), 'jcAlone': jalone, 'jcComponents': int(jcomp)},
}
js = json.dumps(D, separators=(',', ':'), ensure_ascii=False)
hdr = ("// Generated by tools/memes/data/gen_data.py from the Menche lab's Memes_Data repository (knowyourmeme.com, "
       "2022-2023); do not edit.\n// See the generator's header and tools/memes/SPEC.md for what each field holds; decode "
       "it with MDATA (sets/mdata.js).\n")
with open(OUT, 'w', encoding='utf-8') as fh: fh.write(hdr + 'const MEMES_DATA = ' + js + ';\n')
print('wrote', os.path.relpath(OUT), '%.0f KB' % (len(js) / 1024), {k: round(len(json.dumps(v)) / 1024) for k, v in D.items() if len(json.dumps(v)) > 20000})
print('communities', [(c['n'], c['tags']) for c in coms[:12]])
print('hypothesis', json.dumps({k: hyp[k] for k in ('rhoForeign', 'rhoViews', 'rhoYear', 'seeds', 'hidden', 'auc2d')}))
print('bands', json.dumps(hyp['bands']))
print('core', [A[E[k]]['name'] for k in hyp['core'][:12]])
print('subs', [(s['key'], s['n'], s['links'], s['year'], s['allOfYear'], s['hotN']) for s in subs], 'kept links', len(keep))
print('named', int(named.sum()), 'flagged', int(flag.sum()))
