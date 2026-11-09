import { STATUS } from '../lib/screening';

// Ba nút sàng lọc: Đưa vào / Cân nhắc / Loại. Bấm lại nút đang chọn để bỏ chọn.
export default function ScreenButtons({ value, onChange, size = 'sm' }) {
  return (
    <div className="inline-flex overflow-hidden rounded-full ring-1 ring-slate-200" role="group" aria-label="Sàng lọc">
      {Object.entries(STATUS).map(([k, s]) => (
        <button key={k} type="button" aria-pressed={value === k} title={s.label}
          onClick={(e) => { e.stopPropagation(); onChange(value === k ? null : k); }}
          className={`${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'} font-bold transition ${value === k ? s.cls : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
          {size === 'sm' ? s.short : `${s.short} ${s.label}`}
        </button>
      ))}
    </div>
  );
}
