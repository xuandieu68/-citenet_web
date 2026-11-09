import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteMine, getMine } from '../lib/storage';
import { buildDownloads } from '../lib/exporters';
import MapView from '../components/MapView';
import { Chip, Empty } from '../components/ui';

export default function MyMap() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const web = useMemo(() => getMine(slug), [slug]);
  const files = useMemo(() => (web ? buildDownloads(web) : {}), [web]);
  if (!web) return <Empty>Không thấy bản đồ này trong trình duyệt. <Link to="/mine" className="text-brand underline">Về Bản đồ của tôi</Link></Empty>;

  const remove = () => { if (window.confirm('Xóa bản đồ này khỏi trình duyệt?')) { deleteMine(slug); navigate('/mine'); } };
  return (
    <div className="space-y-4">
      <Link to="/mine" className="text-sm font-semibold text-brand hover:underline">← Bản đồ của tôi</Link>
      <MapView
        data={web}
        files={files}
        badge={<Chip>Của tôi · chỉ lưu trên máy này</Chip>}
        actions={
          <>
            <Link to={`/analyze?doi=${encodeURIComponent(web.summary.doi)}`} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Chạy lại với dữ liệu mới</Link>
            <button onClick={remove} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Xóa bản đồ</button>
          </>
        }
      />
    </div>
  );
}
