import { Link, useSearchParams } from 'react-router-dom';
import { useIndex } from '../hooks/useData';
import MapCard from '../components/MapCard';
import { Empty, Loading, SearchInput, Select } from '../components/ui';
import { DOMAIN } from '../utils/labels';
import { norm } from '../utils/format';

const SORTS = {
  updated: ['Mới cập nhật', (a, b) => b.generatedAt.localeCompare(a.generatedAt)],
  year: ['Năm xuất bản mới nhất', (a, b) => (b.year ?? 0) - (a.year ?? 0)],
  papers: ['Nhiều tài liệu nhất', (a, b) => b.papers - a.papers],
  forward: ['Được trích dẫn nhiều nhất', (a, b) => b.forward - a.forward],
};

export default function Maps() {
  const { data, loading } = useIndex();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const domain = params.get('domain') ?? '';
  const sort = params.get('sort') ?? 'updated';
  const set = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); setParams(n, { replace: true }); };

  if (loading) return <Loading />;
  const words = norm(q).split(/\s+/).filter(Boolean);
  const list = data.maps
    .filter((m) => !domain || m.domain === domain)
    .filter((m) => {
      const hay = norm([m.title, m.journal, m.doi, m.authors.join(' '), m.abstract, m.concepts.join(' ')].join(' '));
      return words.every((w) => hay.includes(w));
    })
    .sort(SORTS[sort][1]);
  const domains = [...new Set(data.maps.map((m) => m.domain))];

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-ink">{data.title}</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        {data.description} Mỗi bản đồ được dựng từ một DOI gốc. Rê chuột lên thẻ để xem nhanh, bấm để mở biểu đồ.{' '}
        <Link to="/analyze" className="font-semibold text-brand hover:underline">Dựng bản đồ cho DOI của bạn →</Link>
      </p>
      <div className="my-6 flex flex-col gap-3 md:flex-row">
        <SearchInput value={q} onChange={(v) => set('q', v)} placeholder="Tìm theo tên bài, tác giả, tạp chí, DOI…" className="flex-1" />
        <Select value={domain} onChange={(v) => set('domain', v)} label="Lĩnh vực">
          <option value="">Mọi lĩnh vực</option>
          {domains.map((d) => <option key={d} value={d}>{DOMAIN[d] ?? d}</option>)}
        </Select>
        <Select value={sort} onChange={(v) => set('sort', v)} label="Sắp xếp">
          {Object.entries(SORTS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </div>
      <p className="mb-4 text-sm font-medium text-slate-500">{list.length} bản đồ</p>
      {list.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{list.map((m) => <MapCard key={m.slug} m={m} />)}</div>
      ) : (
        <Empty>Không có bản đồ nào khớp. Thử từ khóa khác.</Empty>
      )}
    </div>
  );
}
