/**
 * Citenet chạy trong trình duyệt: bản JavaScript của citenet/main.py.
 * Giữ nguyên logic: chuẩn hóa DOI → Crossref + OpenAlex cho bài gốc → backward (tài liệu tham khảo),
 * forward (tối đa 20 bài trích dẫn), related (tối đa 10) → gộp trùng → gắn nhãn bằng luật từ khóa → bố cục.
 *
 * Kết quả có cùng cấu trúc graph.json của bản Python: { summary, nodes, edges }.
 * Hàm fetchJson có thể thay thế (dùng để kiểm thử bằng dữ liệu cache của bản Python).
 */

export const FORWARD_CITATION_LIMIT = 20;
export const RELATED_WORK_LIMIT = 10;
const CONCURRENCY = 5;
const MIN_GAP_MS = 110; // ≤ ~9 yêu cầu/giây, dưới giới hạn 10/giây của OpenAlex

// ---------- Tiện ích văn bản (giống main.py) ----------

export function normalizeDoi(raw) {
  return raw.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').toLowerCase();
}

export const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// urllib.parse.quote của Python: chỉ giữ A–Z a–z 0–9 _ . - ~ và các ký tự "safe"
export function pyQuote(s, safe = '/') {
  return Array.from(new TextEncoder().encode(s))
    .map((b) => {
      const ch = String.fromCharCode(b);
      return /[A-Za-z0-9_.\-~]/.test(ch) || safe.includes(ch) ? ch : `%${b.toString(16).toUpperCase().padStart(2, '0')}`;
    })
    .join('');
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
function htmlUnescape(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

// Bảng ngược cp1252 cho vùng 0x80–0x9F (để sửa lỗi font kiểu "Ã©" → "é")
const CP1252 = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f };
function repairMojibake(text) {
  if (!text || !/[ÃÄÂâ]/.test(text)) return text;
  for (const cp1252 of [true, false]) {
    const bytes = [];
    let ok = true;
    for (const ch of text) {
      const c = ch.codePointAt(0);
      if (c < 256) bytes.push(c);
      else if (cp1252 && CP1252[ch] !== undefined) bytes.push(CP1252[ch]);
      else { ok = false; break; }
    }
    if (!ok) continue;
    try {
      const repaired = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
      if ((repaired.match(/�/g) || []).length <= (text.match(/�/g) || []).length) return repaired;
    } catch { /* thử cách khác */ }
  }
  return text;
}

const normalizeWhitespace = (t) => t.replace(/\s+/g, ' ').trim();
export function cleanText(text) {
  if (!text) return '';
  return normalizeWhitespace(repairMojibake(htmlUnescape(String(text).replace(/<[^>]+>/g, ' '))));
}

const uniq = (values) => [...new Set(values.filter(Boolean))];
const round2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
function roundHalfEven(x) { // round() của Python 3
  const f = Math.floor(x), d = x - f;
  if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
}

export function reconstructAbstract(index) {
  if (!index) return '';
  const positions = [];
  for (const [word, idxs] of Object.entries(index)) for (const i of idxs) positions[i] = word;
  return cleanText(positions.filter((w) => w !== undefined).join(' '));
}

// ---------- Gắn nhãn sơ bộ bằng luật từ khóa (giống hệt main.py) ----------

const has = (text, terms) => terms.some((t) => text.includes(t));

function primaryTopic(concepts, text) {
  const names = new Set(concepts.map((c) => cleanText(c.display_name || '').toLowerCase()));
  if (has(text, ['finance', 'financial', 'asset', 'investment', 'trading', 'portfolio', 'stock market'])) return 'finance';
  if (names.has('financial economics') || names.has('finance')) return 'finance';
  if (has(text, ['innovation', 'technology management', 'engineering management'])) return 'innovation management';
  return 'management';
}

export function classifyPaper(title, abstract, concepts, journal) {
  const text = cleanText(`${title} ${abstract} ${journal}`).toLowerCase();
  const topic = primaryTopic(concepts, text);
  let method = 'other', design = 'empirical', evidence = 'L4 empirical', direction = 'mixed';
  let c = 0.58;
  c += abstract ? 0.08 : -0.1;

  if (has(text, ['machine learning', 'deep learning', 'data science', 'artificial intelligence', 'neural network'])) { method = 'machine learning'; c += 0.12; }
  else if (has(text, ['framework', 'decision model', 'hierarchical decision model', 'mcdm'])) { method = 'decision framework'; c += 0.08; }

  if (has(text, ['systematic literature review', 'systematic review', 'meta-analysis'])) { design = 'systematic review'; evidence = 'L2 review'; c += 0.18; }
  else if (has(text, ['literature review', 'review']) && !text.includes('peer review')) { design = 'review'; evidence = 'L3 review'; c += 0.1; }
  else if (has(text, ['case study', 'case-study'])) { design = 'case study'; evidence = 'L4 case study'; c += 0.1; }
  else if (has(text, ['framework', 'decision model', 'conceptual']) && !abstract) { design = 'framework'; evidence = 'L5 conceptual'; c += 0.05; }
  else if (has(text, ['survey']) && !text.includes('systematic')) { design = 'survey'; evidence = 'L3 survey'; c += 0.08; }

  if (has(text, ['outperform', 'improve', 'effective', 'better', 'valuable', 'significant gaps'])) { direction = 'positive'; c += 0.06; }
  else if (has(text, ['limited', 'mixed results', 'uncertain', 'inconclusive'])) { direction = 'mixed'; c += 0.02; }

  if (topic === 'finance') c += 0.06;
  const confidence = Math.max(0.35, Math.min(round2(c), 0.97));
  return { topic, method, study_design: design, evidence_level: evidence, finding_direction: direction, confidence, needs_review: confidence < 0.74 };
}

// ---------- Chuyển dữ liệu OpenAlex thành "paper" ----------

function primaryLocation(work) {
  return work.primary_location || (work.locations || [])[0] || {};
}

export function paperFromOpenAlex(work, nodeType = 'related') {
  const loc = primaryLocation(work);
  const source = loc.source || {};
  const concepts = work.concepts || [];
  const abstract = reconstructAbstract(work.abstract_inverted_index);
  const doi = cleanText((work.doi || '').replace('https://doi.org/', ''));
  const title = cleanText(work.display_name || work.title || 'Untitled');
  const authors = (work.authorships || []).map((a) => cleanText(a.author?.display_name || '')).filter(Boolean);
  const journal = cleanText(source.display_name || '');
  return {
    id: work.id || '',
    openalex_id: work.id || '',
    doi,
    title,
    year: work.publication_year ?? null,
    journal,
    authors,
    abstract,
    citation_count: work.cited_by_count || 0,
    node_type: nodeType,
    relation_types: [nodeType],
    concepts: concepts.slice(0, 5).map((c) => cleanText(c.display_name || '')).filter(Boolean),
    landing_page_url: loc.landing_page_url || '',
    classification: classifyPaper(title, abstract, concepts, journal),
  };
}

// ---------- Gọi API ----------

export class CitenetError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/** Tạo hàm fetchJson thật cho trình duyệt (thêm api_key cho OpenAlex, giãn nhịp, thử lại khi 429). */
export function createFetcher({ apiKey, signal } = {}) {
  let last = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  return async function fetchJson(url) {
    let full = url;
    if (apiKey && url.startsWith('https://api.openalex.org/')) full += (url.includes('?') ? '&' : '?') + `api_key=${encodeURIComponent(apiKey)}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      const gap = last + MIN_GAP_MS - Date.now();
      last = Math.max(Date.now(), last + MIN_GAP_MS);
      if (gap > 0) await wait(gap);
      let res;
      try {
        res = await fetch(full, { signal });
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        throw new CitenetError('network', 'Không kết nối được tới máy chủ dữ liệu. Kiểm tra mạng rồi thử lại.');
      }
      if (res.status === 429) {
        if (attempt < 2) { await wait(1500 * (attempt + 1)); continue; }
        throw new CitenetError('quota', 'OpenAlex báo đã hết hạn mức truy cập. Hãy thêm API key (miễn phí) hoặc thử lại sau.');
      }
      if (res.status === 401 || res.status === 403) throw new CitenetError('key', 'API key OpenAlex không hợp lệ. Kiểm tra lại key trong phần Cài đặt.');
      if (res.status === 404) throw new CitenetError('notfound', 'Không tìm thấy.');
      if (!res.ok) throw new CitenetError('http', `Máy chủ trả lỗi HTTP ${res.status}.`);
      return res.json();
    }
  };
}

async function pool(items, worker, onEach) {
  const out = new Array(items.length);
  let next = 0, done = 0;
  const run = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await worker(items[i]);
      onEach?.(++done, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run));
  return out;
}

const workUrl = (identifier) => `https://api.openalex.org/works/${pyQuote(identifier, ':/')}`;

async function fetchMany(fetchJson, ids, nodeType, onEach) {
  const works = await pool(ids.filter(Boolean), async (id) => {
    try { return await fetchJson(workUrl(id)); }
    catch (e) { if (e.name === 'AbortError' || e.code === 'quota' || e.code === 'key') throw e; return null; }
  }, onEach);
  const seen = new Set(), results = [];
  for (const w of works) {
    if (!w) continue;
    const p = paperFromOpenAlex(w, nodeType);
    const key = p.id || p.doi || p.title;
    if (key && !seen.has(key)) { seen.add(key); results.push(p); }
  }
  return results;
}

function backwardCandidates(seedWork, crossref) {
  const oa = (seedWork.referenced_works || []).map(cleanText).filter(Boolean);
  const cr = (crossref?.reference || []).map((r) => cleanText(r.DOI || '')).filter(Boolean).map((d) => `https://doi.org/${d.toLowerCase()}`);
  return uniq([...oa, ...uniq(cr)]);
}

// ---------- Gộp, bố cục, cạnh, tóm tắt ----------

export function primaryRelation(types) {
  return ['seed', 'backward', 'forward', 'related'].find((r) => types.includes(r)) || 'related';
}

export function mergePapers(all) {
  const map = new Map();
  for (const p of all) {
    const key = p.id || p.doi || p.title;
    const ex = map.get(key);
    if (!ex) { map.set(key, p); continue; }
    ex.relation_types = [...new Set([...ex.relation_types, ...p.relation_types])].sort();
    ex.node_type = primaryRelation(ex.relation_types);
    if (!ex.abstract && p.abstract) ex.abstract = p.abstract;
    if (!ex.journal && p.journal) ex.journal = p.journal;
    if (ex.authors.length < p.authors.length) ex.authors = p.authors;
    ex.citation_count = Math.max(ex.citation_count, p.citation_count);
    if (ex.classification.confidence < p.classification.confidence) ex.classification = p.classification;
  }
  return [...map.values()];
}

export function layoutNodes(papers) {
  const groups = { seed: [], backward: [], forward: [], related: [] };
  for (const p of papers) groups[primaryRelation(p.relation_types)].push(p);
  const pos = { seed: [0, 0], backward: [-290, 0], forward: [290, 0], related: [0, 230] };
  const radii = { seed: 0, backward: 200, forward: 200, related: 270 };
  const out = [];
  for (const [type, items] of Object.entries(groups)) {
    if (type === 'seed') { for (const p of items) { p.x = 0; p.y = 0; out.push(p); } continue; }
    const [cx, cy] = pos[type], r = radii[type], total = Math.max(items.length, 1);
    items.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / total - Math.PI / 2;
      const jitter = i % 2 ? 26 : -26;
      p.x = round2(cx + (r + jitter) * Math.cos(angle));
      p.y = round2(cy + (r + jitter) * Math.sin(angle));
      out.push(p);
    });
  }
  return out;
}

export function buildEdges(seedId, papers) {
  const edges = [];
  for (const p of papers) {
    if (p.id === seedId) continue;
    for (const rel of p.relation_types) edges.push({ source: seedId, target: p.id, relation_type: rel, weight: 1 });
  }
  return edges;
}

export function inferDomain(seed) {
  const text = cleanText([seed.title, seed.journal, seed.abstract, seed.concepts.join(' ')].join(' ')).toLowerCase();
  if (has(text, ['finance', 'financial', 'investment', 'asset management'])) return 'finance / management / machine learning';
  if (has(text, ['biomedical', 'clinical', 'health', 'medicine'])) return 'biomedical';
  return 'general research';
}

// ---------- Chạy toàn bộ ----------

/**
 * @param {string} rawDoi
 * @param {{ fetchJson: (url: string) => Promise<any>, onProgress?: (p) => void, now?: () => number }} opts
 * onProgress nhận { step, done, total } với step ∈ seed | backward | forward | related | build
 */
export async function runCitenet(rawDoi, { fetchJson, onProgress = () => {}, now = () => performance.now() }) {
  const started = now();
  const doi = normalizeDoi(rawDoi);
  if (!/^10\.\d{4,9}\/\S+$/.test(doi)) throw new CitenetError('doi', 'DOI không đúng định dạng. Ví dụ đúng: 10.1016/j.bir.2024.04.014');

  onProgress({ step: 'seed' });
  const [crossrefRes, seedWork] = await Promise.all([
    fetchJson(`https://api.crossref.org/works/${pyQuote(doi)}`).then((r) => r.message).catch((e) => (e.name === 'AbortError' ? Promise.reject(e) : null)),
    fetchJson(`https://api.openalex.org/works/https://doi.org/${pyQuote(doi)}`).catch((e) => {
      if (e.code === 'notfound') throw new CitenetError('notfound', `OpenAlex không có bài báo với DOI ${doi}. Kiểm tra lại DOI.`);
      throw e;
    }),
  ]);
  const crossref = crossrefRes || {};
  const seed = paperFromOpenAlex(seedWork, 'seed');
  seed.relation_types = ['seed'];

  const refIds = backwardCandidates(seedWork, crossref);
  const relatedIds = (seedWork.related_works || []).slice(0, RELATED_WORK_LIMIT);

  onProgress({ step: 'backward', done: 0, total: refIds.length });
  onProgress({ step: 'forward', done: 0, total: 1 });
  onProgress({ step: 'related', done: 0, total: relatedIds.length });
  const [backward, forward, related] = await Promise.all([
    fetchMany(fetchJson, refIds, 'backward', (done, total) => onProgress({ step: 'backward', done, total })),
    (async () => {
      const shortId = seedWork.id.split('/').pop();
      const payload = await fetchJson(`https://api.openalex.org/works?filter=cites:${pyQuote(shortId)}&per-page=${FORWARD_CITATION_LIMIT}&sort=cited_by_count:desc`)
        .catch((e) => { if (e.name === 'AbortError' || e.code === 'quota' || e.code === 'key') throw e; return { results: [] }; });
      onProgress({ step: 'forward', done: 1, total: 1 });
      return (payload.results || []).map((w) => paperFromOpenAlex(w, 'forward'));
    })(),
    fetchMany(fetchJson, relatedIds, 'related', (done, total) => onProgress({ step: 'related', done, total })),
  ]);

  onProgress({ step: 'build' });
  const papers = layoutNodes(mergePapers([seed, ...backward, ...forward, ...related]));
  const edges = buildEdges(seed.id, papers);
  const count = (rel) => papers.filter((p) => p.relation_types.includes(rel)).length;
  const withAbstract = papers.filter((p) => p.abstract).length;
  const summary = {
    doi,
    domain: inferDomain(seed),
    total_papers: papers.length,
    total_edges: edges.length,
    backward: count('backward'),
    forward: count('forward'),
    related: count('related'),
    needs_review: papers.filter((p) => p.classification.needs_review).length,
    abstract_coverage: papers.length ? roundHalfEven((withAbstract / papers.length) * 100) : 0,
    backward_candidates: refIds.length,
    backward_resolved: backward.length,
    forward_limit: FORWARD_CITATION_LIMIT,
    crossref_reference_count: crossref['reference-count'] || 0,
    crossref_cited_by_count: crossref['is-referenced-by-count'] || 0,
    elapsed_seconds: Math.round((now() - started) / 100) / 10,
    generated_at: new Date().toISOString(),
    source: 'browser',
  };
  return { summary, nodes: papers, edges };
}
