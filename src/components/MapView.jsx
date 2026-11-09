import { useMemo, useState } from 'react';
import CitationGraph, { timelineLayout } from './CitationGraph';
import ScreeningBar from './ScreeningBar';
import { useMapRefs } from '../hooks/useMapRefs';
import { computeInsights } from '../lib/insights';
import { STATUS, useScreening } from '../lib/screening';
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
  const { nodes: refNodes, status: refStatus } = useMapRefs(data);
  const nodes = refNodes ?? data.nodes;
  const insights = useMemo(() => computeInsights(nodes), [nodes]);
  const screening = useScreening(slug);

  const [layout, setLayout] = useState('timeline');
  const [selected, setSelected] = useState(null);
  const [visible, setVisible] = useState({ backward: true, forward: true, related: true });
  const [q, setQ] = useState('');
  const [rel, setRel] = useState('');
  const [design, setDesign] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('score');
  const [limit, setLimit] = useState(PAGE);

  const seed = nodes.find((n) => n.rel === 'seed');
  const placed = useMemo(() => (layout === 'timeline' ? timelineLayout(nodes) : { nodes, axes: null }), [nodes, layout]);
  const sortBy = insights ? sort : sort === 'score' ? 'cites' : sort;

  // Bộ lọc dùng chung cho cả biểu đồ (làm mờ nút không khớp) và danh sách
  const filtered = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const sc = (n) => insights?.stats[n.id]?.score ?? 0;
    return nodes
      .filter((n) => n.rel !== 'seed')
      .filter((n) => (!rel || n.rel === rel) && (!design || n.cls.design === design) && (!reviewOnly || n.cls.review))
      .filter((n) => {
        const st = screening.data[n.id]?.status;
        return !status || (status === 'pending' ? !st : st === status);
      })
      .filter((n) => {
        if (!words.length) return true;
        const hay = norm(`${n.title} ${n.authors.join(' ')} ${n.journal} ${n.doi} ${n.year} ${screening.data[n.id]?.note ?? ''}`);
        return words.every((w) => hay.includes(w));
      })
      .sort(
        sortBy === 'score' ? (a, b) => sc(b) - sc(a) || b.cites - a.cites
          : sortBy === 'cites' ? (a, b) => b.cites - a.cites
          : (a, b) => (b.year ?? 0) - (a.year ?? 0)
      );
  }, [nodes, q, rel, design, reviewOnly, status, sortBy, insights, screening.data]);
  const anyFilter = q || rel || design || reviewOnly || status;
  const matches = useMemo(() => (anyFilter ? new Set(filtered.map((n) => n.id)) : null), [filtered, anyFilter]);

  if (!seed) return <Empty>Bản đồ không có dữ liệu bài gốc.</Empty>;
  const s = data.summary;
  const sel = nodes.find((n) => n.id === selected);
  const designs = [...new Set(nodes.map((n) => n.cls.design).filter(Boolean))];
  const toolbar = (
    <div className="flex overflow-hidden rounded-xl bg-slate-900/85 text-xs font-semibold text-slate-200 ring-1 ring-white/10">
      {[['timeline', 'Theo thời gian'], ['cluster', 'Theo nhóm']].map(([k, l]) => (
        <button key={k} onClick={() => setLayout(k)} aria-pressed={layout === k} className={`px-3 py-1.5 ${layout === k ? 'bg-white text-slate-900' : 'hover:bg-white/10'}`}>{l}</button>
      ))}
    </div>
  );

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
        <StatTile value={insights ? insights.links.length : '…'} label="trích dẫn chéo giữa các bài" hint="Số lần một bài trong bản đồ trích dẫn một bài khác trong bản đồ" />
        <StatTile value={`${s.abstract_coverage}%`} label="có tóm tắt" />
      </section>

      {refStatus === 'loading' && <p className="rounded-xl bg-brand-light px-4 py-3 text-sm text-brand-dark">Đang tải dữ liệu trích dẫn chéo từ OpenAlex để tính "nên đọc trước"…</p>}
      {refStatus === 'error' && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">Chưa tải được dữ liệu trích dẫn chéo (cần mạng, có thể cần API key OpenAlex). Bản đồ vẫn dùng được, xếp hạng tạm theo lượt trích dẫn.</p>}

      {/* BIỂU ĐỒ + CHI TIẾT */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <CitationGraph
          nodes={placed.nodes}
          axes={placed.axes}
          edges={data.edges}
          links={insights?.links ?? []}
          insights={insights}
          screen={screening.data}
          selectedId={selected}
          onSelect={setSelected}
          visible={visible}
          onToggle={(k) => setVisible((v) => ({ ...v, [k]: !v[k] }))}
          matches={matches}
          toolbar={toolbar}
        />
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <PaperDetail n={sel} onClose={sel ? () => setSelected(null) : null}
            stat={sel && insights?.stats[sel.id]} top={sel && insights?.top.has(sel.id)}
            screen={sel ? screening.get(sel.id) : {}} onScreen={sel ? (patch) => screening.update(sel.id, patch) : null} />
          {Object.keys(files).length > 0 && (
            <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <h2 className="mb-3 font-extrabold text-ink">Tải cả bản đồ</h2>
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
                      {isUrl ? <a href={v} download={`${slug}-${f}`} className={cls}>{inner}</a>
                        : <button onClick={() => downloadText(`${slug}-${f}`, v, FILES[f]?.[2] ?? 'text/plain')} className={cls}>{inner}</button>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* SÀNG LỌC + DANH SÁCH */}
      <section className="space-y-4">
        <ScreeningBar nodes={nodes} slug={slug} data={screening.data} onFilter={(st) => { setStatus(st); setLimit(PAGE); }} active={status} />
        <h2 className="text-xl font-extrabold text-ink">Tài liệu trong bản đồ</h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={(v) => { setQ(v); setLimit(PAGE); }} placeholder="Lọc theo tên bài, tác giả, tạp chí, năm, ghi chú…" className="flex-1" />
          <Select value={rel} onChange={setRel} label="Quan hệ">
            <option value="">Mọi quan hệ</option>
            {['backward', 'forward', 'related'].map((k) => <option key={k} value={k}>{REL[k].label}</option>)}
          </Select>
          <Select value={status} onChange={setStatus} label="Sàng lọc">
            <option value="">Mọi trạng thái</option>
            <option value="pending">Chưa sàng lọc</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Select value={design} onChange={setDesign} label="Thiết kế">
            <option value="">Mọi thiết kế</option>
            {designs.map((d) => <option key={d} value={d}>{label(DESIGN, d)}</option>)}
          </Select>
          <Select value={sortBy} onChange={setSort} label="Sắp xếp">
            {insights && <option value="score">Nên đọc trước</option>}
            <option value="cites">Trích dẫn nhiều nhất</option>
            <option value="year">Mới nhất</option>
          </Select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <p>{filtered.length} tài liệu{anyFilter ? ' khớp bộ lọc (các nút khác đang được làm mờ trên biểu đồ)' : ''}</p>
          <label className="flex items-center gap-2 font-medium text-slate-700">
            <input type="checkbox" checked={reviewOnly} onChange={(e) => setReviewOnly(e.target.checked)} className="h-4 w-4 accent-brand" />
            Chỉ bài có nhãn cần kiểm tra
          </label>
        </div>
        {sortBy === 'score' && (
          <p className="text-xs text-slate-500">
            "Nên đọc trước" xếp theo điểm = 3 × số bài trích dẫn bài gốc cũng trích dẫn bài này + 2 × số bài trong bản đồ trích dẫn bài này + số tài liệu tham khảo chung với bài gốc.
          </p>
        )}
        {filtered.length ? (
          <div className="grid grid-cols-1 gap-2">
            {filtered.slice(0, limit).map((n) => (
              <PaperCard key={n.id} p={n} rel={n.rel} active={n.id === selected} onSelect={() => setSelected(n.id)}
                stat={insights?.stats[n.id]} top={insights?.top.has(n.id)}
                screen={screening.data[n.id]?.status} onScreen={(st) => screening.update(n.id, { status: st })} />
            ))}
          </div>
        ) : (
          <Empty>Không có tài liệu nào khớp bộ lọc.</Empty>
        )}
        {filtered.length > limit && (
          <button onClick={() => setLimit(limit + PAGE)} className="mx-auto mt-2 block rounded-full border border-brand px-5 py-2 font-bold text-brand hover:bg-brand-light">
            Xem thêm ({filtered.length - limit})
          </button>
        )}
      </section>
    </article>
  );
}
