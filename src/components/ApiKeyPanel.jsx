import { useState } from 'react';
import { getApiKey, setApiKey } from '../lib/storage';

// Ô nhập API key của OpenAlex. Key chỉ lưu trong trình duyệt này, không gửi đi đâu ngoài api.openalex.org.
export default function ApiKeyPanel({ onChange }) {
  const [saved, setSaved] = useState(getApiKey);
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(!getApiKey());

  const save = () => { if (!draft.trim()) return; setApiKey(draft); setSaved(draft.trim()); setDraft(''); setOpen(false); onChange?.(draft.trim()); };
  const remove = () => { setApiKey(''); setSaved(''); setOpen(true); onChange?.(''); };

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-ink">API key OpenAlex</h2>
          <p className={`mt-1 text-sm ${saved ? 'text-emerald-700' : 'text-amber-700'}`}>
            {saved ? `Đã lưu key ••••${saved.slice(-4)}` : 'Chưa có key: vẫn chạy được nhưng hạn mức mỗi ngày rất thấp.'}
          </p>
        </div>
        <button onClick={() => setOpen(!open)} className="shrink-0 text-sm font-semibold text-brand hover:underline">{open ? 'Thu gọn' : saved ? 'Đổi key' : 'Thêm key'}</button>
      </div>
      {open && (
        <div className="mt-4 space-y-3">
          <form onSubmit={(e) => { e.preventDefault(); save(); }} className="flex gap-2">
            <input type="password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Dán API key vào đây" aria-label="API key OpenAlex" autoComplete="off"
              className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/15" />
            <button className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">Lưu</button>
          </form>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600">
            <li>Tạo tài khoản miễn phí tại <a href="https://openalex.org" target="_blank" rel="noreferrer" className="text-brand underline">openalex.org</a>.</li>
            <li>Vào phần cài đặt tài khoản → <strong>API key</strong>, sao chép key.</li>
            <li>Dán vào ô trên. Key chỉ lưu trong trình duyệt này và chỉ được gửi tới api.openalex.org.</li>
          </ol>
          {saved && <button onClick={remove} className="text-xs font-semibold text-red-600 hover:underline">Xóa key đã lưu</button>}
        </div>
      )}
    </div>
  );
}
