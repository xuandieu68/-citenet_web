// Các component giao diện nhỏ, dùng lại ở nhiều trang
import { REL } from '../utils/labels';

export function RelBadge({ rel, size = 'sm' }) {
  const r = REL[rel] ?? REL.related;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full ring-1 ${r.soft} ${size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'} font-semibold`}>
      <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
      {r.label}
    </span>
  );
}

export function Chip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-brand-light text-brand-dark',
    warn: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function StatTile({ value, label, hint }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200" title={hint}>
      <p className="text-2xl font-extrabold text-ink sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-slate-500 sm:text-sm">{label}</p>
    </div>
  );
}

export function Section({ title, action, children, className = '' }) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-xl font-extrabold text-ink sm:text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SearchInput({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-slate-400">
        <path d="M8.5 3a5.5 5.5 0 014.38 8.83l3.65 3.64-1.06 1.06-3.64-3.65A5.5 5.5 0 118.5 3zm0 1.5a4 4 0 100 8 4 4 0 000-8z" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-10 pr-4 outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
      />
    </div>
  );
}

export function Loading() {
  return <p className="py-10 text-center text-slate-500">Đang tải dữ liệu…</p>;
}

export function Empty({ children }) {
  return <p className="rounded-2xl bg-white p-8 text-center text-slate-500 ring-1 ring-slate-200">{children}</p>;
}

export function Select({ value, onChange, children, label }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm">
      {children}
    </select>
  );
}

// Thanh tỉ lệ backward / forward / related của một bản đồ
export function RelBar({ m }) {
  const total = Math.max(m.backward + m.forward + m.related, 1);
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
      {['backward', 'forward', 'related'].map((k) => (
        <span key={k} style={{ width: `${(m[k] / total) * 100}%`, background: REL[k].color }} />
      ))}
    </div>
  );
}
