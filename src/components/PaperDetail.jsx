import { Chip, RelBadge } from './ui';
import { DESIGN, DIRECTION, METHOD, TOPIC, label } from '../utils/labels';
import { doiUrl, fmtNum } from '../utils/format';

// Bảng thông tin chi tiết của nút đang chọn trên biểu đồ
export default function PaperDetail({ n, onClose }) {
  if (!n) {
    return (
      <div className="rounded-2xl bg-white p-5 text-sm text-slate-500 ring-1 ring-slate-200">
        Bấm vào một nút trên biểu đồ hoặc một tài liệu trong danh sách để xem chi tiết.
      </div>
    );
  }
  const c = n.cls;
  const rows = [
    ['Chủ đề', label(TOPIC, c.topic)],
    ['Phương pháp', label(METHOD, c.method)],
    ['Thiết kế', label(DESIGN, c.design)],
    ['Mức bằng chứng', c.evidence || '—'],
    ['Hướng kết quả', label(DIRECTION, c.direction)],
    ['Độ tin cậy nhãn', c.confidence != null ? c.confidence.toFixed(2) : '—'],
  ];
  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <RelBadge rel={n.rel} size="md" />
          {c.review && <Chip tone="warn">Cần kiểm tra</Chip>}
        </div>
        {onClose && <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Đóng">✕</button>}
      </div>
      <div>
        <h3 className="font-extrabold leading-snug text-ink">{n.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{n.authors.join(', ') || 'Không rõ tác giả'}</p>
        <p className="mt-1 text-xs text-slate-500">{n.journal || '—'} · {n.year ?? 'n.d.'} · <strong className="text-ink">{fmtNum(n.cites)}</strong> lượt trích dẫn</p>
      </div>
      {n.abstract ? (
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Tóm tắt</summary>
          <p className="mt-2 max-h-56 overflow-auto text-sm leading-relaxed text-slate-700">{n.abstract}</p>
        </details>
      ) : (
        <p className="text-sm italic text-slate-400">Không có tóm tắt trong nguồn dữ liệu.</p>
      )}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}><dt className="text-[11px] text-slate-400">{k}</dt><dd className="font-medium text-slate-800">{v}</dd></div>
        ))}
      </dl>
      <p className="text-[11px] leading-relaxed text-slate-400">Nhãn do Citenet gắn tự động bằng luật từ khóa trên tiêu đề và tóm tắt, chỉ dùng để sắp xếp sơ bộ.</p>
      {n.concepts.length > 0 && <div className="flex flex-wrap gap-1">{n.concepts.map((x) => <Chip key={x}>{x}</Chip>)}</div>}
      {n.doi && (
        <a href={doiUrl(n.doi)} target="_blank" rel="noreferrer" className="block rounded-xl bg-brand px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-brand-dark">
          Mở trên doi.org ↗
        </a>
      )}
    </div>
  );
}
