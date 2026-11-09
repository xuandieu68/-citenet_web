import { useState } from 'react';
import { STATUS, copyText, counts } from '../lib/screening';
import { exportBib, exportRis, fromSlim } from '../lib/exporters';

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Thanh tổng kết sàng lọc (kiểu PRISMA rút gọn) + đưa các bài đã chọn sang Zotero.
 * Cách khuyên dùng: "Sao chép DOI" rồi dán vào nút cây đũa thần (Add Item by Identifier) của Zotero:
 * Zotero tự lấy đủ thông tin (tập, số, trang…) cho từng bài.
 */
export default function ScreeningBar({ nodes, slug, data, onFilter, active }) {
  const [withMaybe, setWithMaybe] = useState(false);
  const [msg, setMsg] = useState('');
  const c = counts(nodes, data);
  const chosen = nodes.filter((n) => n.rel !== 'seed' && (data[n.id]?.status === 'include' || (withMaybe && data[n.id]?.status === 'maybe')));
  const dois = chosen.map((n) => n.doi).filter(Boolean);
  const noDoi = chosen.length - dois.length;
  const pct = c.total ? Math.round(((c.total - c.pending) / c.total) * 100) : 0;

  const copy = async () => {
    const ok = await copyText(dois.join('\n'));
    setMsg(ok ? `Đã chép ${dois.length} DOI. Mở Zotero → bấm cây đũa thần (Add Item by Identifier) → dán (Ctrl+V) → Enter.` : 'Trình duyệt chặn sao chép. Hãy dùng nút tải RIS.');
  };

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-ink">Sàng lọc tài liệu</h2>
          <p className="mt-0.5 text-sm text-slate-500">Bấm ✓ ? ✕ trên từng bài. Kết quả và ghi chú chỉ lưu trên trình duyệt này.</p>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-label={`Đã sàng lọc ${pct}%`}>
            <span className="bg-emerald-500" style={{ width: `${(c.include / Math.max(c.total, 1)) * 100}%` }} />
            <span className="bg-amber-400" style={{ width: `${(c.maybe / Math.max(c.total, 1)) * 100}%` }} />
            <span className="bg-slate-400" style={{ width: `${(c.exclude / Math.max(c.total, 1)) * 100}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {[['', `Tất cả ${c.total}`, 'bg-slate-100 text-slate-700'], ['pending', `Chưa xem ${c.pending}`, 'bg-slate-100 text-slate-700'],
              ...Object.entries(STATUS).map(([k, s]) => [k, `${s.label} ${c[k]}`, s.soft])].map(([k, l, cls]) => (
              <button key={k || 'all'} onClick={() => onFilter(k)} aria-pressed={active === k}
                className={`rounded-full px-2.5 py-1 font-semibold ring-1 ring-transparent ${cls} ${active === k ? '!ring-brand' : ''}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <div className="flex flex-wrap gap-2">
            <button onClick={copy} disabled={!dois.length}
              className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-40">
              Sao chép {dois.length} DOI cho Zotero
            </button>
            <button onClick={() => download(`${slug}-da-chon.ris`, exportRis(chosen.map(fromSlim)), 'application/x-research-info-systems')} disabled={!chosen.length}
              className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40">RIS</button>
            <button onClick={() => download(`${slug}-da-chon.bib`, exportBib(chosen.map(fromSlim)), 'application/x-bibtex')} disabled={!chosen.length}
              className="rounded-full border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40">BibTeX</button>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={withMaybe} onChange={(e) => setWithMaybe(e.target.checked)} className="h-3.5 w-3.5 accent-brand" />
            Gồm cả bài "Cân nhắc"
          </label>
          {noDoi > 0 && <p className="text-xs text-amber-700">{noDoi} bài đã chọn không có DOI, có trong file RIS/BibTeX.</p>}
        </div>
      </div>
      {msg && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">{msg}</p>}
    </div>
  );
}
