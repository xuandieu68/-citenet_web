// Sàng lọc tài liệu (Đưa vào / Cân nhắc / Loại + ghi chú), lưu theo từng bản đồ trong trình duyệt.
// Dùng được cho cả bản đồ của Bộ sưu tập: mỗi người tự sàng lọc trên máy mình, không ai khác thấy.
import { useCallback, useEffect, useState } from 'react';

const key = (slug) => `citenet:screen:${slug}`;
const load = (slug) => { try { return JSON.parse(localStorage.getItem(key(slug)) || '{}'); } catch { return {}; } };

export const STATUS = {
  include: { label: 'Đưa vào', short: '✓', cls: 'bg-emerald-600 text-white', soft: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  maybe: { label: 'Cân nhắc', short: '?', cls: 'bg-amber-500 text-white', soft: 'bg-amber-50 text-amber-800 ring-amber-200' },
  exclude: { label: 'Loại', short: '✕', cls: 'bg-slate-500 text-white', soft: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export function useScreening(slug) {
  const [data, setData] = useState(() => load(slug));
  useEffect(() => setData(load(slug)), [slug]);
  const update = useCallback((id, patch) => {
    setData((prev) => {
      const cur = { ...(prev[id] || {}), ...patch };
      if (!cur.status && !cur.note) { const { [id]: _, ...rest } = prev; save(slug, rest); return rest; }
      const next = { ...prev, [id]: cur };
      save(slug, next);
      return next;
    });
  }, [slug]);
  return { data, get: (id) => data[id] || {}, update };
}

function save(slug, value) {
  try { localStorage.setItem(key(slug), JSON.stringify(value)); } catch { /* hết dung lượng: bỏ qua */ }
}

export function counts(nodes, data) {
  const c = { total: 0, include: 0, maybe: 0, exclude: 0, pending: 0 };
  for (const n of nodes) {
    if (n.rel === 'seed') continue;
    c.total++;
    const s = data[n.id]?.status;
    if (s) c[s]++; else c.pending++;
  }
  return c;
}

/** Chép chữ vào clipboard (có phương án dự phòng cho trình duyệt cũ) */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.position = 'absolute'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}
