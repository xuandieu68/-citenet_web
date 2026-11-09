import { Link, useParams } from 'react-router-dom';
import { useIndex, useMap } from '../hooks/useData';
import MapView from '../components/MapView';
import { Chip, Empty, Loading } from '../components/ui';

// Một bản đồ trong Bộ sưu tập (dữ liệu tĩnh trong public/data)
export default function MapDetail() {
  const { slug } = useParams();
  const { data: index } = useIndex();
  const { data, loading, error } = useMap(slug);
  if (error) return <Empty>Không tìm thấy bản đồ này. <Link to="/maps" className="text-brand underline">Về Bộ sưu tập</Link></Empty>;
  if (loading) return <Loading />;
  const meta = index?.maps.find((m) => m.slug === slug);
  const base = `${import.meta.env.BASE_URL}downloads/${slug}/`;
  const files = Object.fromEntries((meta?.files ?? []).map((f) => [f, base + f]));
  return (
    <div className="space-y-4">
      <Link to="/maps" className="text-sm font-semibold text-brand hover:underline">← Bộ sưu tập</Link>
      <MapView data={data} files={files} badge={<Chip>Bộ sưu tập</Chip>} />
    </div>
  );
}
