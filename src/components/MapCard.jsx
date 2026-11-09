import { Link } from 'react-router-dom';
import HoverPreview from './HoverPreview';
import { Chip, RelBar } from './ui';
import { DOMAIN, REL, label } from '../utils/labels';
import { firstSentences, fmtNum, shortAuthors } from '../utils/format';

// Thẻ một bản đồ trích dẫn (một DOI gốc) + thẻ xem nhanh khi rê chuột
export default function MapCard({ m, to = `/map/${m.slug}` }) {
  return (
    <HoverPreview preview={() => <MapPreview m={m} to={to} />}>
      <Link to={to} className="group flex h-full flex-col rounded-2xl bg-white p-5 ring-1 ring-slate-200 transition hover:ring-brand/40">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-slate-500">
          <span className="truncate font-medium">{m.journal}</span>
          <span className="shrink-0 font-bold text-ink">{m.year}</span>
        </div>
        <h3 className="line-clamp-3 font-bold leading-snug text-ink group-hover:text-brand">{m.title}</h3>
        <p className="mt-2 truncate text-sm text-slate-500">{shortAuthors(m.authors)}</p>
        <div className="mt-auto pt-4">
          <RelBar m={m} />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span><strong className="text-ink">{fmtNum(m.papers)}</strong> tài liệu</span>
            {m.needsReview > 0 && <span>{m.needsReview} cần kiểm tra</span>}
          </div>
        </div>
      </Link>
    </HoverPreview>
  );
}

function MapPreview({ m, to }) {
  return (
    <Link to={to} className="flex h-full flex-col gap-3 p-5">
      <div>
        <p className="text-xs text-slate-500">{m.journal} · {m.year}</p>
        <h3 className="mt-1 text-lg font-extrabold leading-snug text-ink">{m.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{shortAuthors(m.authors, 4)}</p>
      </div>
      {m.abstract ? (
        <p className="line-clamp-4 text-sm leading-relaxed text-slate-700">{firstSentences(m.abstract, 3)}</p>
      ) : (
        <p className="text-sm italic text-slate-400">Nguồn dữ liệu không có tóm tắt cho bài này.</p>
      )}
      <div className="grid grid-cols-3 gap-2 text-center">
        {['backward', 'forward', 'related'].map((k) => (
          <div key={k} className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-lg font-extrabold" style={{ color: REL[k].color }}>{m[k]}</p>
            <p className="text-[11px] text-slate-500">{REL[k].label}</p>
          </div>
        ))}
      </div>
      {m.topCited.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Được trích dẫn nhiều nhất trong bản đồ</p>
          <ul className="space-y-0.5 text-sm text-slate-700">
            {m.topCited.slice(0, 2).map((t) => (
              <li key={t.title} className="truncate">• {t.title} <span className="text-slate-400">({t.year}, {fmtNum(t.cites)} lượt)</span></li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2">
        <Chip tone="blue">{label(DOMAIN, m.domain)}</Chip>
        <span className="whitespace-nowrap text-sm font-bold text-brand">Mở bản đồ →</span>
      </div>
    </Link>
  );
}
