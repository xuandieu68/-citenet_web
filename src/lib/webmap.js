// Chuyển graph.json (cấu trúc của Citenet) sang dạng gọn mà web hiển thị.
// Giống hàm slim_node trong scripts/build_data.py để bản đồ trong trình duyệt và bản đồ có sẵn dùng chung giao diện.
import { primaryRelation, slugify } from './citenet.js';

export function slimNode(n) {
  const c = n.classification || {};
  return {
    id: n.id,
    doi: n.doi || '',
    title: n.title || '(không có tiêu đề)',
    year: n.year ?? null,
    journal: n.journal || '',
    authors: n.authors || [],
    abstract: n.abstract || '',
    cites: n.citation_count || 0,
    rel: primaryRelation(n.relation_types || [n.node_type]),
    rels: n.relation_types || [],
    concepts: (n.concepts || []).slice(0, 6),
    url: n.landing_page_url || (n.doi ? `https://doi.org/${n.doi}` : ''),
    cls: {
      topic: c.topic, method: c.method, design: c.study_design, evidence: c.evidence_level,
      direction: c.finding_direction, confidence: c.confidence, review: Boolean(c.needs_review),
    },
    x: n.x ?? 0,
    y: n.y ?? 0,
  };
}

export function toWebMap(graph) {
  const slug = slugify(graph.summary.doi);
  return {
    slug,
    summary: graph.summary,
    nodes: graph.nodes.map(slimNode),
    edges: graph.edges.map((e) => ({ s: e.source, t: e.target, rel: e.relation_type })),
  };
}

// Thông tin tóm tắt của một bản đồ (giống một mục trong public/data/index.json) để hiện bằng MapCard
export function mapMeta(web) {
  const s = web.summary;
  const seed = web.nodes.find((n) => n.rel === 'seed') || web.nodes[0];
  const top = web.nodes.filter((n) => n.rel !== 'seed').sort((a, b) => b.cites - a.cites).slice(0, 3);
  return {
    slug: web.slug, doi: s.doi, title: seed.title, year: seed.year, journal: seed.journal,
    authors: seed.authors, abstract: seed.abstract, concepts: seed.concepts, domain: s.domain,
    papers: s.total_papers, edges: s.total_edges, backward: s.backward, forward: s.forward, related: s.related,
    needsReview: s.needs_review, abstractCoverage: s.abstract_coverage, generatedAt: (s.generated_at || '').slice(0, 10),
    topCited: top.map((n) => ({ title: n.title, year: n.year, cites: n.cites })),
  };
}
