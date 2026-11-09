import HoverPreview from './HoverPreview';
import ScreenButtons from './ScreenButtons';
import { Chip, RelBadge } from './ui';
import { DESIGN, label } from '../utils/labels';
import { doiUrl, firstSentences, fmtNum, shortAuthors } from '../utils/format';

/**
 * Một dòng tài liệu (dùng ở trang Tài liệu và danh sách trong bản đồ).
 *  - p: tài liệu; rel: quan hệ với bài gốc (nếu có); extra: nội dung thêm bên phải
 *  - onSelect: bấm vào dòng (ví dụ: chọn nút trên biểu đồ)
 */
export default function PaperCard({ p, rel, extra, footer, onSelect, active, stat, top, screen, onScreen }) {
  const clickable = Boolean(onSelect);
  return (
    <HoverPreview width={460} placement="below" preview={() => <PaperPreview p={p} rel={rel} stat={stat} />}>
      <div
        onClick={onSelect}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => e.key === 'Enter' && onSelect() : undefined}
        className={`flex w-full items-start gap-4 rounded-xl bg-white px-4 py-3 text-left ring-1 transition ${clickable ? 'cursor-pointer' : ''} ${
          active ? 'ring-2 ring-brand' : 'ring-slate-200 hover:ring-brand/40'
        } ${screen === 'exclude' ? 'opacity-60' : ''}`}
      >
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold leading-snug text-ink">{p.title}</p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {shortAuthors(p.authors)} · {p.year ?? 'n.d.'} · <span className="italic">{p.journal || '—'}</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {top && <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-800 ring-1 ring-yellow-300">★ Nên đọc trước</span>}
            {rel && <RelBadge rel={rel} />}
            {(p.cls?.design || p.design) && <Chip>{label(DESIGN, p.cls?.design || p.design)}</Chip>}
            {p.cls?.review && <Chip tone="warn">Cần kiểm tra</Chip>}
          </div>
          {footer}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 text-right">
          <div>
            <p className="font-extrabold text-ink">{fmtNum(p.cites)}</p>
            <p className="text-[11px] text-slate-500">lượt trích dẫn</p>
            {stat && <p className="text-[11px] text-slate-500">{stat.local} trích dẫn trong bản đồ</p>}
            {extra}
          </div>
          {onScreen && <ScreenButtons value={screen} onChange={onScreen} />}
        </div>
      </div>
    </HoverPreview>
  );
}

function PaperPreview({ p, rel, stat }) {
  return (
    <div className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap gap-1.5">{rel && <RelBadge rel={rel} />}</div>
      <h3 className="font-extrabold leading-snug text-ink">{p.title}</h3>
      <p className="text-sm text-slate-600">{shortAuthors(p.authors, 5)}</p>
      <p className="text-xs text-slate-500">{p.journal} · {p.year} · {fmtNum(p.cites)} lượt trích dẫn</p>
      {stat && <p className="text-xs text-slate-600">Trong bản đồ: {stat.local} bài trích dẫn · cùng được trích dẫn với bài gốc: {stat.cocited} · chung tài liệu tham khảo: {stat.coupling}</p>}
      {p.abstract ? (
        <p className="line-clamp-5 text-sm leading-relaxed text-slate-700">{firstSentences(p.abstract, 3)}</p>
      ) : (
        <p className="text-sm italic text-slate-400">Không có tóm tắt trong nguồn dữ liệu.</p>
      )}
      {p.concepts?.length > 0 && (
        <div className="flex flex-wrap gap-1">{p.concepts.slice(0, 5).map((c) => <Chip key={c}>{c}</Chip>)}</div>
      )}
      {p.doi && <a href={doiUrl(p.doi)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand hover:underline">doi.org/{p.doi} ↗</a>}
    </div>
  );
}
