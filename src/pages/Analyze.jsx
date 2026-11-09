import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CitenetError, createFetcher, normalizeDoi, runCitenet, slugify } from '../lib/citenet';
import { mapMeta, toWebMap } from '../lib/webmap';
import { buildDownloads } from '../lib/exporters';
import { getApiKey, getMine, saveMine } from '../lib/storage';
import { useIndex } from '../hooks/useData';
import ApiKeyPanel from '../components/ApiKeyPanel';
import MapView from '../components/MapView';
import { Chip } from '../components/ui';

const STEPS = [
  ['seed', 'Lấy thông tin bài gốc', 'Crossref + OpenAlex'],
  ['backward', 'Tài liệu tham khảo', 'mỗi tài liệu một lượt tra cứu'],
  ['forward', 'Bài trích dẫn bài gốc', `tối đa 20 bài`],
  ['related', 'Bài liên quan', 'tối đa 10 bài'],
  ['build', 'Gắn nhãn & dựng biểu đồ', ''],
];

export default function Analyze() {
  const [params, setParams] = useSearchParams();
  const { data: index } = useIndex();
  const [doi, setDoi] = useState(params.get('doi') ?? '');
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [progress, setProgress] = useState({});
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { web, files, saved }
  const [elapsed, setElapsed] = useState(0);
  const abort = useRef(null);
  const started = useRef(0);

  useEffect(() => {
    if (status !== 'running') return;
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [status]);

  // Tự chạy khi mở trang với ?doi=... (ví dụ từ ô nhập ở Trang chủ)
  useEffect(() => {
    const d = params.get('doi');
    if (d && status === 'idle') run(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalized = normalizeDoi(doi || '');
  const inCollection = index?.maps.find((m) => m.doi.toLowerCase() === normalized);
  const savedBefore = normalized && getMine(slugify(normalized));

  async function run(raw = doi) {
    const d = normalizeDoi(raw);
    setDoi(d);
    setParams(d ? { doi: d } : {}, { replace: true });
    setStatus('running'); setError(null); setResult(null); setProgress({}); setElapsed(0);
    started.current = Date.now();
    abort.current = new AbortController();
    try {
      const graph = await runCitenet(d, {
        fetchJson: createFetcher({ apiKey: getApiKey(), signal: abort.current.signal }),
        onProgress: (p) => setProgress((prev) => ({ ...prev, [p.step]: p, current: p.step })),
      });
      const web = toWebMap(graph);
      const saved = saveMine(mapMeta(web), web);
      setResult({ web, files: buildDownloads(web), saved });
      setStatus('done');
    } catch (e) {
      if (e.name === 'AbortError') { setStatus('idle'); return; }
      setError(e instanceof CitenetError ? e : new CitenetError('unknown', `Có lỗi không mong đợi: ${e.message}`));
      setStatus('error');
    }
  }

  // Trạng thái từng bước: todo | doing | done
  const stepState = (key) => {
    if (status === 'done') return 'done';
    const p = progress[key];
    if (key === 'seed') return !progress.current ? 'todo' : progress.current === 'seed' ? 'doing' : 'done';
    if (!p) return 'todo';
    if (key === 'build') return 'doing';
    return p.done >= p.total ? 'done' : 'doing';
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-ink">Phân tích DOI</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Nhập DOI của một bài báo. Trình duyệt của bạn sẽ tự lấy dữ liệu từ Crossref và OpenAlex, dựng bản đồ trích dẫn và lưu vào
          <Link to="/mine" className="mx-1 font-semibold text-brand hover:underline">Bản đồ của tôi</Link>
          ngay trên máy bạn. Không ai khác thấy bạn đã tra cứu gì.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:p-6">
          <form onSubmit={(e) => { e.preventDefault(); run(); }} className="flex flex-col gap-2 sm:flex-row">
            <input value={doi} onChange={(e) => setDoi(e.target.value)} disabled={status === 'running'} placeholder="Ví dụ: 10.1016/j.bir.2024.04.014 hoặc https://doi.org/…" aria-label="DOI"
              className="min-w-0 flex-1 rounded-full border-2 border-brand px-5 py-3 outline-none focus:ring-4 focus:ring-brand/15 disabled:bg-slate-50" />
            {status === 'running' ? (
              <button type="button" onClick={() => abort.current?.abort()} className="rounded-full border border-slate-300 px-6 py-3 font-bold text-slate-700 hover:bg-slate-50">Hủy</button>
            ) : (
              <button disabled={!doi.trim()} className="rounded-full bg-brand px-6 py-3 font-bold text-white hover:bg-brand-dark disabled:opacity-40">Dựng bản đồ</button>
            )}
          </form>

          {(status === 'idle' || status === 'error') && (inCollection || savedBefore) && (
            <p className="text-sm text-slate-600">
              DOI này đã có sẵn:{' '}
              {inCollection && <Link to={`/map/${inCollection.slug}`} className="font-semibold text-brand hover:underline">trong Bộ sưu tập</Link>}
              {inCollection && savedBefore && ' · '}
              {savedBefore && <Link to={`/mine/${slugify(normalized)}`} className="font-semibold text-brand hover:underline">trong Bản đồ của tôi</Link>}
              . Bấm "Dựng bản đồ" để chạy lại với dữ liệu mới nhất.
            </p>
          )}

          {status === 'idle' && index && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Thử với:</span>
              {index.maps.slice(0, 3).map((m) => (
                <button key={m.slug} onClick={() => setDoi(m.doi)} className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-brand-light" title={m.title}>{m.doi}</button>
              ))}
            </div>
          )}

          {(status === 'running' || status === 'done' || status === 'error') && (
            <ol className="space-y-2">
              {STEPS.map(([key, title, hint]) => {
                const st = stepState(key);
                const p = progress[key];
                return (
                  <li key={key} className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-2.5">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      st === 'done' ? 'bg-emerald-500 text-white' : st === 'doing' && status === 'running' ? 'animate-pulse bg-brand text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {st === 'done' ? '✓' : '•'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{title}</span>
                      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
                    </span>
                    {p?.total > 1 && <span className="text-sm font-semibold tabular-nums text-slate-600">{p.done}/{p.total}</span>}
                  </li>
                );
              })}
              {status === 'running' && <p className="pt-1 text-xs text-slate-500">Đã chạy {elapsed} giây. Bài có nhiều tài liệu tham khảo có thể mất 20–60 giây.</p>}
            </ol>
          )}

          {status === 'error' && (
            <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
              <p className="font-bold">Không dựng được bản đồ</p>
              <p className="mt-1">{error.message}</p>
              {error.code === 'network' && <p className="mt-1 text-red-700">Nếu mạng vẫn ổn, có thể tiện ích chặn quảng cáo đang chặn api.openalex.org hoặc api.crossref.org.</p>}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <ApiKeyPanel />
          <div className="rounded-2xl bg-white p-5 text-sm text-slate-600 ring-1 ring-slate-200">
            <h2 className="mb-2 font-extrabold text-ink">Quyền riêng tư</h2>
            <p>Mọi thứ chạy trong trình duyệt của bạn. Web không có máy chủ riêng nên không lưu DOI, kết quả hay API key của bạn.
              Trình duyệt chỉ gửi yêu cầu tới api.crossref.org và api.openalex.org.</p>
          </div>
        </aside>
      </div>

      {result && (
        <section className="space-y-3">
          {result.saved ? (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
              ✓ Đã lưu vào <Link to="/mine" className="font-bold underline">Bản đồ của tôi</Link> trên trình duyệt này.
            </p>
          ) : (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
              Bộ nhớ trình duyệt đã đầy nên chưa lưu được bản đồ này. Hãy tải file về, hoặc xóa bớt bản đồ cũ trong Bản đồ của tôi.
            </p>
          )}
          <MapView data={result.web} files={result.files} badge={<Chip tone="blue">Vừa tạo</Chip>} />
        </section>
      )}
    </div>
  );
}
