/**
 * "Bản đồ thông minh": phân tích quan hệ trích dẫn GIỮA các bài trong bản đồ (không chỉ với bài gốc).
 * Cần trường refs (mã OpenAlex các tài liệu mà mỗi bài trích dẫn).
 *
 * Ba chỉ số cho mỗi bài:
 *  - local:   số bài khác trong bản đồ trích dẫn bài này (bài gốc không tính) → bài "nền tảng" của chủ đề
 *  - coupling: số tài liệu tham khảo chung với bài gốc (bibliographic coupling) → cùng nền tảng lý thuyết
 *  - cocited: số bài trích dẫn bài gốc cũng trích dẫn bài này (co-citation) → thường được đọc cùng bài gốc
 * Điểm liên quan = 3 × cocited + 2 × local + coupling (công khai, dễ giải thích; không phải "AI").
 */
const shortId = (id) => (id || '').split('/').pop();

export const hasRefs = (nodes) => nodes.some((n) => Array.isArray(n.refs));

export function computeInsights(nodes) {
  if (!hasRefs(nodes)) return null;
  const seed = nodes.find((n) => n.rel === 'seed');
  const ids = new Map(nodes.map((n) => [shortId(n.id), n.id]));
  const seedRefs = new Set(seed?.refs || []);
  const forwardRefs = nodes.filter((n) => n.rels.includes('forward') || n.rel === 'forward').map((n) => new Set(n.refs || []));

  const links = []; // trích dẫn chéo: { s: bài trích dẫn, t: bài được trích dẫn }
  const local = new Map();
  for (const n of nodes) {
    for (const r of n.refs || []) {
      const target = ids.get(r);
      if (!target || target === n.id) continue;
      if (n.rel !== 'seed') {
        links.push({ s: n.id, t: target });
        local.set(target, (local.get(target) || 0) + 1);
      }
    }
  }

  const stats = {};
  for (const n of nodes) {
    if (n.rel === 'seed') continue;
    const sid = shortId(n.id);
    const coupling = (n.refs || []).filter((r) => seedRefs.has(r)).length;
    const cocited = forwardRefs.filter((set) => set.has(sid)).length;
    const l = local.get(n.id) || 0;
    stats[n.id] = { local: l, coupling, cocited, score: 3 * cocited + 2 * l + coupling };
  }
  const ranked = Object.entries(stats)
    .filter(([, s]) => s.score > 0)
    .sort((a, b) => b[1].score - a[1].score || (nodes.find((n) => n.id === b[0])?.cites ?? 0) - (nodes.find((n) => n.id === a[0])?.cites ?? 0))
    .map(([id]) => id);
  const top = new Set(ranked.slice(0, 10));
  const covered = nodes.filter((n) => Array.isArray(n.refs)).length;
  return { stats, links, ranked, top, coverage: covered / nodes.length };
}

/** Gắn refs lấy được từ OpenAlex vào nút (dùng cho bản đồ cũ chưa có refs) */
export function attachRefs(nodes, refsById) {
  return nodes.map((n) => (refsById[shortId(n.id)] ? { ...n, refs: refsById[shortId(n.id)] } : { ...n, refs: n.refs ?? [] }));
}

/** Lấy referenced_works cho nhiều bài, 50 bài một lượt gọi OpenAlex */
export async function fetchRefs(nodes, fetchJson) {
  const ids = nodes.map((n) => shortId(n.id)).filter((id) => /^W\d+$/.test(id));
  const out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const res = await fetchJson(`https://api.openalex.org/works?filter=openalex:${chunk.join('|')}&per-page=50&select=id,referenced_works`);
    for (const w of res.results || []) out[shortId(w.id)] = (w.referenced_works || []).map(shortId);
  }
  return out;
}
