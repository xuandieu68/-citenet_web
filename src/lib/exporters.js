// Xuất file giống hệt bản Python: refs.csv, refs.bib, refs.ris, summary.md
import { slugify } from './citenet.js';

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCsv(papers) {
  const head = ['title', 'doi', 'year', 'journal', 'node_type', 'relation_types', 'citation_count', 'topic', 'method', 'study_design', 'evidence_level', 'finding_direction', 'confidence', 'authors', 'landing_page_url'];
  const rows = papers.map((p) => {
    const c = p.classification;
    return [p.title, p.doi, p.year ?? '', p.journal, p.node_type, p.relation_types.join(', '), p.citation_count, c.topic, c.method, c.study_design, c.evidence_level, c.finding_direction, c.confidence, p.authors.join('; '), p.landing_page_url];
  });
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function exportBib(papers) {
  return papers
    .map((p, i) => {
      const first = (p.authors[0] || 'paper').split(' ').filter(Boolean).pop() || 'paper';
      const key = `${slugify(`${first}-${p.year ?? 'na'}`)}-${i + 1}`;
      return `@article{${key},\n  title = {${p.title}},\n  author = {${p.authors.join(' and ')}},\n  journal = {${p.journal}},\n  year = {${p.year ?? ''}},\n  doi = {${p.doi}},\n  url = {${p.landing_page_url}}\n}`;
    })
    .join('\n\n');
}

export function exportRis(papers) {
  return papers
    .map((p) => ['TY  - JOUR', ...p.authors.map((a) => `AU  - ${a}`), `TI  - ${p.title}`, `JO  - ${p.journal}`, `PY  - ${p.year ?? ''}`, `DO  - ${p.doi}`, `UR  - ${p.landing_page_url}`, 'ER  - '].join('\n'))
    .join('\n\n');
}

export function exportSummary(s, seed) {
  return [
    `# Citenet summary for ${s.doi}`, '',
    `- Title: ${seed.title}`, `- Domain: ${s.domain}`, `- Total papers: ${s.total_papers}`, `- Total edges: ${s.total_edges}`,
    `- Backward papers: ${s.backward}`, `- Backward candidates checked: ${s.backward_candidates}`, `- Backward resolved in graph: ${s.backward_resolved}`,
    `- Forward papers: ${s.forward}`, `- Forward limit: ${s.forward_limit}`, `- Related papers: ${s.related}`,
    `- Abstract coverage: ${s.abstract_coverage}%`, `- Papers needing review: ${s.needs_review}`, `- Runtime: ${s.elapsed_seconds}s`,
    '', '## Seed paper', '', seed.abstract || 'No abstract available.',
  ].join('\n');
}

// Dữ liệu gọn của web → dạng "paper" của Python để xuất file
export const fromSlim = (n) => ({
  title: n.title, doi: n.doi, year: n.year, journal: n.journal, authors: n.authors,
  node_type: n.rel, relation_types: n.rels.length ? n.rels : [n.rel], citation_count: n.cites,
  landing_page_url: n.url, abstract: n.abstract,
  classification: { topic: n.cls.topic, method: n.cls.method, study_design: n.cls.design, evidence_level: n.cls.evidence, finding_direction: n.cls.direction, confidence: n.cls.confidence },
});

export function buildDownloads(web) {
  const papers = web.nodes.map(fromSlim);
  const seed = papers.find((p) => p.node_type === 'seed') || papers[0];
  return {
    'refs.csv': exportCsv(papers),
    'refs.ris': exportRis(papers),
    'refs.bib': exportBib(papers),
    'summary.md': exportSummary(web.summary, seed),
  };
}
