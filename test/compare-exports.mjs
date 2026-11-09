// So file xuất của JS với refs.csv / refs.ris / refs.bib của Python (so theo tập bản ghi vì thứ tự bài có thể khác)
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runCitenet, CitenetError } from '../src/lib/citenet.js';
import { exportCsv, exportRis, exportBib } from '../src/lib/exporters.js';

const [cacheDir, pyDir, doi] = process.argv.slice(2);
const fetchJson = async (url) => {
  const f = join(cacheDir, createHash('sha256').update(url).digest('hex') + '.json');
  if (!existsSync(f)) throw new CitenetError('notfound', url);
  return JSON.parse(readFileSync(f, 'utf8'));
};
const g = await runCitenet(doi, { fetchJson, now: () => Date.now() });
// Dùng đúng thứ tự nút của Python để so cả khóa BibTeX
const py = JSON.parse(readFileSync(join(pyDir, 'graph.json'), 'utf8'));
const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
const ordered = py.nodes.map((n) => byId[n.id]);
const norm = (s) => s.replace(/\r\n/g, '\n').trim();
for (const [name, fn] of [['refs.csv', exportCsv], ['refs.ris', exportRis], ['refs.bib', exportBib]]) {
  const a = norm(fn(ordered)), b = norm(readFileSync(join(pyDir, name), 'utf8'));
  console.log(`${a === b ? '✓' : '✗'} ${name} ${a === b ? 'giống hệt' : `khác (js ${a.length} ký tự, py ${b.length})`}`);
  if (a !== b) { const al = a.split('\n'), bl = b.split('\n'); const i = al.findIndex((l, k) => l !== bl[k]); console.log('  dòng', i, '\n  js:', al[i], '\n  py:', bl[i]); }
}
