import { useMemo, useState } from 'react';
import CitationGraph from './CitationGraph';
import PaperDetail from './PaperDetail';
import PaperCard from './PaperCard';
import { Chip, Empty, SearchInput, Select, StatTile } from './ui';
import { DESIGN, DOMAIN, REL, label } from '../utils/labels';
import { doiUrl, fmtDate, fmtNum, norm } from '../utils/format';

export const FILES = {
  'refs.csv': ['CSV', 'Mở bằng Excel để lọc, sắp xếp', 'text/csv'],
  'refs.ris': ['RIS', 'Import vào Zotero, Mendeley, EndNote', 'application/x-research-info-systems'],
  'refs.bib': ['BibTeX', 'Dùng với LaTeX / Overleaf', 'application/x-bibtex'],
  'summary.md': ['Báo cáo', 'Tóm tắt lần chạy', 'text/markdown'],
};
const PAGE = 40;

// Tải một file tạo ngay trong trình duyệt (không cần máy chủ)
function downloadText(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Giao diện một bản đồ trích dẫn: thông tin bài gốc, số liệu, biểu đồ, bảng chi tiết, tải về, danh sách tài liệu.
 * Dùng chung cho bản đồ trong Bộ sưu tập và bản đồ người dùng tự tạo.
 *  - data: { slug, summary, nodes, edges }
 *  - files: { 'refs.csv': url | nội dung } — chuỗi bắt đầu bằng "http"/"/" là đường dẫn, còn lại là nội dung tạo sẵn
 *  - badge, actions: nội dung thêm ở đầu trang
 */
export default function MapView({ data, files = {}, badge, actions }) {
  const slug = data.slug;
  const [selected, setSelected] = useState(null);
  const [visible, setVisible] = useState({ backward: true, forward: true, related: true });
  const [q, setQ] = useState('');
  const [rel, setRel] = useState('');
  const [design, setDesign] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [sort, setSort] = useState('cites');
  const [limit, setLimit] = useState(PAGE);

  const nodes = data.nodes;
  const seed = nodes.find((n) => n.rel === 'seed');

  // Bộ lọc dùng chung cho cả biểu đồ (làm mờ nút không khớp) và danh sách
  const filtered = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return nodes
      .filter((n) => n.rel !== 'seed')
      .filter((n) => (!rel || n.rel === rel) && (!design || n.cls.design === design) && (!reviewOnly || n.cls.review))
      .filter((n) => {
        if (!words.length) return true;
        const hay = norm(`${n.title} ${n.authors.join(' ')} ${n.journal} ${n.doi} ${n.year}`);
        return words.every((w) => hay.includes(w));
      })
      .sort(sort === 'cites' ? (a, b) => b.cites - a.cites : (a, b) => (b.year ?? 0) - (a.year ?? 0));
  }, [nodes, q, rel, design, reviewOnly, sort]);
  const anyFilter = q || rel || design || reviewOnly;
  const matches = useMemo(() => (anyFilter ? new Set(filtered.map((n) => n.id)) : null), [filtered, anyFilter]);

  const s = data.summary;
  const sel = nodes.find((n) => n.id === selected);
  const designs = [...new Set(nodes.map((n) => n.cls.design).filter(Boolean))];

  return (
    <article className="space-y-6">
      {/* THÔNG TIN BÀI GỐC */}
      <header className="rounded-3xl bg-white p-6 ring-1 ring-slate-200 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          {badge}
          <Chip tone="blue">{label(DOMAIN, s.domain)}</Chip>
          <span className="text-xs text-slate-500">Tạo ngày {fmtDate((s.generated_at || '').slice(0, 10))} · chạy trong {s.elapsed_seconds}s</span>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold leading-tight text-ink sm:text-3xl">{seed.title}</h1>
        <p className="mt-2 text-slate-600">{seed.authors.join(', ')}</p>
        <p className="mt-1 text-sm text-slate-500">
          <span className="italic">{seed.journal}</span> · {seed.year} ·{' '}
          <a href={doiUrl(seed.doi)} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">doi.org/{seed.doi} ↗</a>
        </p>
        {seed.abstract && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold text-brand">Tóm tắt bài gốc</summary>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-700">{seed.abstract}</p>
          </details>
        )}
        {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatTile value={fmtNum(s.total_papers)} label="tài liệu trong bản đồ" />
        <StatTile value={s.backward} label={`tài liệu tham khảo (${s.backward_candidates} ứng viên)`} hint="Số reference lấy được metadata / tổng số reference thu được" />
        <StatTile value={s.forward} label={`bài trích dẫn (tối đa ${s.forward_limit})`} />
        <StatTile value={s.related} label="bài liên quan" />
        <StatTile value={`${s.abstract_coverage}%`} label="có tóm tắt" />
        <StatTile value={s.needs_review} label="cần kiểm tra thủ công" hint="Độ tin cậy nhãn dưới 0,74 hoặc thiếu thông tin" />
      </section>

      {/* BIỂU ĐỒ + CHI TIẾT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <CitationGraph
          nodes={nodes}
          edges={data.edges}
          selectedId={selected}
          onSelect={setSelected}
          visible={visible}
          onToggle={(k) => setVisible((v) => ({ ...v, [k]: !v[k] }))}
          matches={matches}
        />
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <PaperDetail n={sel} onClose={sel ? () => setSelected(null) : null} />
          {Object.keys(files).length > 0 && (
            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <h2 className="mb-3 font-extrabold text-ink">Tải về</h2>
              <ul className="grid grid-cols-2 gap-2">
                {Object.entries(files).map(([f, v]) => {
                  const cls = 'block w-full rounded-xl bg-slate-50 px-3 py-2 text-left ring-1 ring-slate-200 hover:ring-brand';
                  const inner = (
                    <>
                      <span className="block text-sm font-bold text-ink">{FILES[f]?.[0] ?? f}</span>
                      <span className="block text-[11px] leading-tight text-slate-500">{FILES[f]?.[1]}</span>
                    </>
                  );
                  const isUrl = /^(https?:)?\//.test(v);
                  return (
                    <li key={f}>
                      {isUrl ? (
                        <a href={v} download={`${slug}-${f}`} className={cls}>{inner}</a>
                      ) : (
                        <button onClick={() => downloadText(`${slug}-${f}`, v, FILES[f]?.[2] ?? 'text/plain')} className={cls}>{inner}</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* DANH SÁCH TÀI LIỆU */}
      <section>
        <h2 className="mb-4 text-xl font-extrabold text-ink">Tài liệu trong bản đồ</h2>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={(v) => { setQ(v); setLimit(PAGE); }} placeholder="Lọc theo tên bài, tác giả, tạp chí, năm…" className="flex-1" />
          <Select value={rel} onChange={setRel} label="Quan hệ">
            <option value="">Mọi quan hệ</option>
            {['backward', 'forward', 'related'].map((k) => <option key={k} value={k}>{REL[k].label}</option>)}
          </Select>
          <Select value={design} onChange={setDesign} label="Thiết kế">
            <option value="">Mọi thiết kế</option>
            {designs.map((d) => <option key={d} value={d}>{label(DESIGN, d)}</option>)}
          </Select>
          <Select value={sort} onChange={setSort} label="Sắp xếp">
            <option value="cites">Trích dẫn nhiều nhất</option>
            <option value="year">Mới nhất</option>
          </Select>
          <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700">
            <input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} className="h-4 w-4 accent-brand" />
            Chỉ bài cần kiểm tra
          </label>
        </div>
        <p className="mb-3 text-sm text-slate-500">{filtered.length} tài liệu{anyFilter ? ' khớp bộ lọc (các nút khác đang được làm mờ trên biểu đồ)' : ''}</p>
        {filtered.length ? (
          <div className="grid grid-cols-1 gap-2">
            {filtered.slice(0, limit).map((n) => (
              <PaperCard key={n.id} p={n} rel={n.rel} active={n.id === selected} onSelect={() => setSelected(n.id)} />
            ))}
          </div>
        ) : (
          <Empty>Không có tài liệu nào khớp bộ lọc.</Empty>
        )}
        {filtered.length > limit && (
          <button onClick={() => setLimit(limit + PAGE)} className="mx-auto mt-4 block rounded-full border border-brand px-5 py-2 font-bold text-brand hover:bg-brand-light">
            Xem thêm ({filtered.length - limit})
          </button>
        )}
      </section>
    </article>
  );
}
