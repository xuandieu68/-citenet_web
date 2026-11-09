// Kiểm thử: chạy pipeline JavaScript trên chính các phản hồi API mà bản Python đã lưu trong cache
// (work/Citenet/cache/<sha256(url)>.json), rồi so với graph.json do Python tạo ra.
// Cách chạy: node test/compare-with-python.mjs <thư mục cache> <graph.json của Python> <DOI>
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCitenet, CitenetError } from '../src/lib/citenet.js';

const [cacheDir, pyGraphPath, doi] = process.argv.slice(2);
const fetchJson = async (url) => {
  const file = join(cacheDir, createHash('sha256').update(url).digest('hex') + '.json');
  if (!existsSync(file)) throw new CitenetError('notfound', `cache miss: ${url}`);
  return JSON.parse(readFileSync(file, 'utf8'));
};

const js = await runCitenet(doi, { fetchJson, now: () => Date.now() });
const py = JSON.parse(readFileSync(pyGraphPath, 'utf8'));

const keys = ['total_papers', 'total_edges', 'backward', 'forward', 'related', 'needs_review', 'abstract_coverage', 'backward_candidates', 'backward_resolved', 'crossref_reference_count', 'domain'];
let fail = 0;
for (const k of keys) {
  const ok = JSON.stringify(js.summary[k]) === JSON.stringify(py.summary[k]);
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} summary.${k}: js=${js.summary[k]} py=${py.summary[k]}`);
}
const byId = (g) => Object.fromEntries(g.nodes.map((n) => [n.id, n]));
const J = byId(js), P = byId(py);
const fields = ['doi', 'title', 'year', 'journal', 'authors', 'abstract', 'citation_count', 'node_type', 'relation_types', 'concepts', 'landing_page_url', 'classification'];
let diffs = 0;
for (const id of new Set([...Object.keys(J), ...Object.keys(P)])) {
  if (!J[id] || !P[id]) { diffs++; console.log(`✗ node ${id} chỉ có ở ${J[id] ? 'JS' : 'Python'}`); continue; }
  for (const f of fields) {
    if (JSON.stringify(J[id][f]) !== JSON.stringify(P[id][f])) { diffs++; console.log(`✗ ${id}.${f}\n   js=${JSON.stringify(J[id][f]).slice(0, 160)}\n   py=${JSON.stringify(P[id][f]).slice(0, 160)}`); }
  }
}
console.log(`\n${Object.keys(P).length} nút Python, ${Object.keys(J).length} nút JS, ${diffs} khác biệt trường, ${fail} khác biệt summary`);
process.exit(diffs + fail ? 1 : 0);
