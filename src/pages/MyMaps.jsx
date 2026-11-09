import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMine } from '../hooks/useMine';
import { exportAll, importAll, usageKb } from '../lib/storage';
import MapCard from '../components/MapCard';
import { Empty } from '../components/ui';

// Bản đồ người dùng tự tạo, lưu trong trình duyệt
export default function MyMaps() {
  const list = useMine();
  const fileRef = useRef(null);
  const [msg, setMsg] = useState(null);

  const backup = () => {
    const blob = new Blob([JSON.stringify(exportAll())], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `citenet-ban-do-cua-toi-${new Date().toISOString().slice(0, 10)}.json` });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const restore = async (file) => {
    try { const n = importAll(JSON.parse(await file.text())); setMsg({ ok: true, text: `Đã nhập ${n} bản đồ.` }); }
    catch (e) { setMsg({ ok: false, text: e.message || 'Không đọc được file.' }); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Bản đồ của tôi</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Bản đồ bạn đã tạo ở trang Phân tích DOI. Chúng chỉ nằm trong trình duyệt này: xóa dữ liệu trình duyệt sẽ mất, nên hãy sao lưu định kỳ.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/analyze" className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">+ Phân tích DOI mới</Link>
          {list.length > 0 && <button onClick={backup} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Sao lưu (.json)</button>}
          <button onClick={() => fileRef.current.click()} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">Nhập bản sao lưu</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files[0] && restore(e.target.files[0])} />
        </div>
      </header>
      {msg && <p className={`rounded-xl px-4 py-3 text-sm ring-1 ${msg.ok ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-red-50 text-red-800 ring-red-200'}`}>{msg.text}</p>}
      {list.length ? (
        <>
          <p className="text-sm text-slate-500">{list.length} bản đồ · khoảng {usageKb().toLocaleString('vi-VN')} KB trong bộ nhớ trình duyệt</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((m) => <MapCard key={m.slug} m={m} to={`/mine/${m.slug}`} />)}
          </div>
        </>
      ) : (
        <Empty>Bạn chưa tạo bản đồ nào. <Link to="/analyze" className="font-semibold text-brand underline">Phân tích DOI đầu tiên</Link></Empty>
      )}
    </div>
  );
}
