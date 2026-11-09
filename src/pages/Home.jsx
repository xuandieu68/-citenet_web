import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useIndex, usePapers } from '../hooks/useData';
import MapCard from '../components/MapCard';
import PaperCard from '../components/PaperCard';
import { Loading, Section, StatTile } from '../components/ui';
import { fmtNum } from '../utils/format';
import { REL } from '../utils/labels';

const STEPS = [
  ['Nhập một DOI', 'Ví dụ 10.1016/j.bir.2024.04.014. Citenet kiểm tra và chuẩn hóa DOI.'],
  ['Thu thập', 'Lấy metadata từ Crossref và OpenAlex: tài liệu tham khảo, tối đa 20 bài trích dẫn và 10 bài liên quan.'],
  ['Gắn nhãn sơ bộ', 'Chủ đề, phương pháp, thiết kế nghiên cứu, mức bằng chứng, kèm độ tin cậy, bằng luật từ khóa.'],
  ['Xuất kết quả', 'Biểu đồ tương tác, file CSV / RIS (Zotero) / BibTeX (Overleaf) và báo cáo tóm tắt.'],
];

export default function Home() {
  const { data, loading } = useIndex();
  const { data: papers } = usePapers();
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  if (loading) return <Loading />;
  const t = data.totals;
  const shared = (papers ?? []).filter((p) => p.maps.length > 1).slice(0, 5);

  return (
    <div className="space-y-14">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-brand-dark px-6 py-10 text-white sm:px-10 sm:py-14">
        <HeroDots />
        <div className="relative max-w-2xl">
          <p className="text-sm font-semibold text-blue-200">Từ một DOI đến một bản đồ tài liệu</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-5xl">Khởi động literature review nhanh hơn</h1>
          <p className="mt-4 text-blue-100">
            Citenet dựng mạng trích dẫn quanh một bài báo: bài đó trích dẫn ai, ai trích dẫn lại nó, và những bài liên quan.
            Bạn lọc, đọc nhanh và đưa thẳng vào Zotero hoặc Overleaf.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); navigate(`/papers?q=${encodeURIComponent(q)}`); }} className="mt-6 flex max-w-xl rounded-full bg-white p-1.5 shadow-lg">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm trong tài liệu: uncertainty, green innovation…" aria-label="Tìm tài liệu"
              className="min-w-0 flex-1 rounded-full px-4 text-ink outline-none" />
            <button className="rounded-full bg-brand px-5 py-2.5 font-bold hover:bg-blue-700">Tìm</button>
          </form>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link to="/maps" className="rounded-full bg-white/10 px-4 py-2 font-semibold hover:bg-white/20">Xem {t.maps} bản đồ →</Link>
            <Link to="/guide" className="rounded-full px-4 py-2 font-semibold text-blue-100 hover:bg-white/10">Cách đọc kết quả</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile value={t.maps} label="bản đồ trích dẫn (DOI gốc)" />
        <StatTile value={fmtNum(t.uniquePapers)} label="tài liệu khác nhau" />
        <StatTile value={fmtNum(t.edges)} label="liên kết trích dẫn" />
        <StatTile value={t.sharedPapers} label="tài liệu xuất hiện ở ≥ 2 bản đồ" hint="Thường là các bài nền tảng của chủ đề" />
      </section>

      <Section title="Bản đồ mới cập nhật" action={<Link to="/maps" className="text-sm font-bold text-brand hover:underline">Xem tất cả →</Link>}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.maps.slice(0, 8).map((m) => <MapCard key={m.slug} m={m} />)}
        </div>
      </Section>

      {shared.length > 0 && (
        <Section title="Tài liệu nền tảng" action={<Link to="/papers?shared=1" className="text-sm font-bold text-brand hover:underline">Xem thêm →</Link>}>
          <p className="-mt-2 mb-4 text-sm text-slate-500">Xuất hiện trong nhiều bản đồ nhất, nên đọc trước.</p>
          <div className="grid grid-cols-1 gap-2">
            {shared.map((p) => (
              <PaperCard key={p.doi || p.title} p={p} extra={<p className="mt-1 text-[11px] font-bold text-brand">{p.maps.length} bản đồ</p>} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Citenet hoạt động thế nào">
        <ol className="grid gap-4 md:grid-cols-4">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
              <p className="mt-3 font-bold text-ink">{title}</p>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}

// Trang trí hero: một mạng trích dẫn nhỏ (giữ tỉ lệ để chấm luôn tròn)
function HeroDots() {
  const pts = [[60, 18], [86, 30], [92, 62], [70, 86], [40, 80], [30, 40], [50, 50]];
  const colors = [REL.backward.color, REL.forward.color, REL.related.color];
  return (
    <svg aria-hidden className="absolute inset-y-0 right-0 h-full w-1/2 opacity-70 max-md:hidden" viewBox="0 0 100 100" preserveAspectRatio="xMaxYMid meet">
      {pts.map(([x, y], i) => <line key={i} x1="64" y1="54" x2={x} y2={y} stroke="#93c5fd" strokeWidth="0.4" />)}
      <circle cx="64" cy="54" r="5" fill={REL.seed.color} />
      {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2 + (i % 3)} fill={colors[i % 3]} />)}
    </svg>
  );
}
