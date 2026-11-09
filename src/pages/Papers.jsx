import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useIndex, usePapers } from '../hooks/useData';
import PaperCard from '../components/PaperCard';
import { Empty, Loading, SearchInput, Select } from '../components/ui';
import { DESIGN, REL, label } from '../utils/labels';
import { norm } from '../utils/format';

const PAGE = 50;
const SORTS = {
  maps: ['Xuất hiện ở nhiều bản đồ', (a, b) => b.maps.length - a.maps.length || b.cites - a.cites],
  cites: ['Trích dẫn nhiều nhất', (a, b) => b.cites - a.cites],
  year: ['Mới nhất', (a, b) => (b.year ?? 0) - (a.year ?? 0)],
};

// Tất cả tài liệu của mọi bản đồ, đã gộp trùng theo DOI
export default function Papers() {
  const { data, loading } = usePapers();
  const { data: index } = useIndex();
  const [params, setParams] = useSearchParams();
  const [limit, setLimit] = useState(PAGE);
  const q = params.get('q') ?? '';
  const shared = params.get('shared') === '1';
  const design = params.get('design') ?? '';
  const sort = params.get('sort') ?? 'maps';
  const set = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); setParams(n, { replace: true }); setLimit(PAGE); };

  const titles = useMemo(() => Object.fromEntries((index?.maps ?? []).map((m) => [m.slug, m])), [index]);
  const list = useMemo(() => {
    if (!data) return [];
    const words = norm(q).split(/\s+/).filter(Boolean);
    return data
      .filter((p) => (!shared || p.maps.length > 1) && (!design || p.design === design))
      .filter((p) => {
        if (!words.length) return true;
        const hay = norm(`${p.title} ${p.authors.join(' ')} ${p.journal} ${p.doi} ${p.year} ${p.concepts.join(' ')}`);
        return words.every((w) => hay.includes(w));
      })
      .sort(SORTS[sort][1]);
  }, [data, q, shared, design, sort]);

  if (loading) return <Loading />;
  const designs = [...new Set(data.map((p) => p.design).filter(Boolean))];

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ink">Tài liệu</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Toàn bộ {data.length.toLocaleString('vi-VN')} tài liệu từ mọi bản đồ, đã gộp trùng theo DOI.
        Tài liệu xuất hiện ở nhiều bản đồ thường là nền tảng của chủ đề.
      </p>
      <div className="my-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Tìm theo tên bài, tác giả, tạp chí, khái niệm, DOI…" className="flex-1" />
        <Select value={design} onChange={(v) => set('design', v)} label="Thiết kế">
          <option value="">Mọi thiết kế</option>
          {designs.map((d) => <option key={d} value={d}>{label(DESIGN, d)}</option>)}
        </Select>
        <Select value={sort} onChange={(v) => set('sort', v)} label="Sắp xếp">
          {Object.entries(SORTS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </Select>
        <label className="flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-700">
          <input type="checkbox" checked={shared} onChange={(e) => set('shared', e.target.checked ? '1' : '')} className="h-4 w-4 accent-brand" />
          Chỉ tài liệu ở ≥ 2 bản đồ
        </label>
      </div>
      <p className="mb-3 text-sm font-medium text-slate-500">{list.length.toLocaleString('vi-VN')} tài liệu</p>
      {list.length ? (
        <div className="grid grid-cols-1 gap-2">
          {list.slice(0, limit).map((p) => (
            <PaperCard
              key={p.doi || p.title}
              p={p}
              extra={p.maps.length > 1 && <p className="mt-1 text-[11px] font-bold text-brand">{p.maps.length} bản đồ</p>}
              footer={
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  {p.maps.map((m) => (
                    <Link key={m.slug} to={`/map/${m.slug}`} className="inline-flex max-w-xs items-center gap-1 hover:text-brand">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: REL[m.rel]?.color }} />
                      <span className="truncate">{titles[m.slug]?.title ?? m.slug}</span>
                    </Link>
                  ))}
                </p>
              }
            />
          ))}
        </div>
      ) : (
        <Empty>Không có tài liệu nào khớp. Thử từ khóa khác.</Empty>
      )}
      {list.length > limit && (
        <button onClick={() => setLimit(limit + PAGE)} className="mx-auto mt-4 block rounded-full border border-brand px-5 py-2 font-bold text-brand hover:bg-brand-light">
          Xem thêm ({(list.length - limit).toLocaleString('vi-VN')})
        </button>
      )}
    </div>
  );
}
