import { useEffect, useMemo, useRef, useState } from 'react';
import { REL } from '../utils/labels';
import { fmtNum, nodeLabel, shortAuthors } from '../utils/format';

const PAD = 70;
const W = 1100, H = 640; // khung toạ độ của bố cục thời gian

/**
 * Bố cục "theo thời gian" (giống Litmaps): trục ngang = năm xuất bản, trục dọc = lượt trích dẫn (thang log).
 * Bài cũ bên trái, bài mới bên phải, bài được trích dẫn nhiều ở trên cao.
 */
export function timelineLayout(nodes) {
  const years = nodes.map((n) => n.year).filter(Boolean);
  const y0 = Math.min(...years), y1 = Math.max(...years, y0 + 1);
  const maxLog = Math.log10(Math.max(...nodes.map((n) => n.cites || 0), 10) + 1);
  const xOf = (year) => 80 + ((year - y0) / (y1 - y0)) * (W - 160);
  const yOf = (c) => H - 60 - (Math.log10((c || 0) + 1) / maxLog) * (H - 120);
  const seen = new Map();
  const placed = nodes.map((n) => {
    let x = n.year ? xOf(n.year) : 30, y = yOf(n.cites);
    // tránh chồng nút: các bài cùng ô lưới được dời lệch nhau một chút
    const cell = `${Math.round(x / 14)}:${Math.round(y / 14)}`;
    const k = seen.get(cell) || 0;
    seen.set(cell, k + 1);
    if (k) { x += ((k % 2 ? 1 : -1) * Math.ceil(k / 2) * 9); y += (k % 3) * 5; }
    return { ...n, x, y };
  });
  const span = y1 - y0, step = span > 60 ? 20 : span > 30 ? 10 : span > 12 ? 5 : span > 5 ? 2 : 1;
  const yearTicks = [];
  for (let yr = Math.ceil(y0 / step) * step; yr <= y1; yr += step) yearTicks.push({ v: yr, x: xOf(yr) });
  const citeTicks = [0, 10, 100, 1000, 10000, 100000].filter((c) => Math.log10(c + 1) <= maxLog).map((c) => ({ v: c, y: yOf(c) }));
  return { nodes: placed, axes: { yearTicks, citeTicks, x0: 60, x1: W - 40, yBase: H - 40 } };
}

/**
 * Biểu đồ trích dẫn SVG.
 *  - nodes đã có toạ độ x, y; links = trích dẫn chéo giữa các bài (từ insights); edges = cạnh tới bài gốc
 *  - Kéo để di chuyển, cuộn / nút +/− để phóng to, bấm chú thích để ẩn/hiện nhóm
 *  - Rê chuột vào nút: tooltip; bấm vào nút: onSelect(id)
 */
export default function CitationGraph({ nodes, edges, links = [], axes, insights, screen = {}, selectedId, onSelect, visible, onToggle, matches, toolbar }) {
  const wrap = useRef(null);
  const svg = useRef(null);
  const drag = useRef(null);
  const [hover, setHover] = useState(null);

  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const home = useMemo(() => {
    const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
    if (axes) { xs.push(axes.x0 - 20, axes.x1); ys.push(axes.yBase + 70); }
    const x = Math.min(...xs) - PAD, y = Math.min(...ys) - PAD;
    return { x, y, w: Math.max(...xs) + PAD - x, h: Math.max(...ys) + PAD - y };
  }, [nodes, axes]);
  const [view, setView] = useState(home);
  useEffect(() => setView(home), [home]);

  // Nhãn chữ: bài gốc + bài "nên đọc" (nếu có phân tích) hoặc 6 bài được trích dẫn nhiều nhất + bài đang chọn
  const labelled = useMemo(() => {
    const top = insights ? insights.ranked.slice(0, 8) : [...nodes].filter((n) => n.rel !== 'seed').sort((a, b) => b.cites - a.cites).slice(0, 6).map((n) => n.id);
    return new Set([...top, ...nodes.filter((n) => n.rel === 'seed').map((n) => n.id)]);
  }, [nodes, insights]);

  const radius = (n) => {
    if (n.rel === 'seed') return 16;
    if (insights) return 4 + Math.min(11, Math.sqrt(insights.stats[n.id]?.score || 0) * 2.2);
    return 5 + Math.min(10, 2.4 * Math.log10((n.cites || 0) + 1));
  };

  const zoom = (factor, cx = view.x + view.w / 2, cy = view.y + view.h / 2) => {
    setView((v) => {
      const w = Math.min(home.w * 3, Math.max(home.w / 10, v.w * factor));
      const h = (w / v.w) * v.h;
      return { x: cx - ((cx - v.x) * w) / v.w, y: cy - ((cy - v.y) * h) / v.h, w, h };
    });
  };
  const toGraph = (clientX, clientY) => {
    const r = svg.current.getBoundingClientRect();
    const s = Math.max(view.w / r.width, view.h / r.height);
    const offX = (r.width * s - view.w) / 2, offY = (r.height * s - view.h) / 2;
    return { x: view.x - offX + (clientX - r.left) * s, y: view.y - offY + (clientY - r.top) * s, s };
  };
  useEffect(() => {
    const el = svg.current;
    const onWheel = (e) => { e.preventDefault(); const p = toGraph(e.clientX, e.clientY); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, p.x, p.y); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  });
  const onPointerDown = (e) => {
    if (e.target.closest('[data-node]')) return;
    drag.current = { x: e.clientX, y: e.clientY, view, s: toGraph(e.clientX, e.clientY).s };
    svg.current.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const d = drag.current;
    setView({ ...d.view, x: d.view.x - (e.clientX - d.x) * d.s, y: d.view.y - (e.clientY - d.y) * d.s });
  };
  const onPointerUp = () => { drag.current = null; };
  const showHover = (n, e) => {
    const r = wrap.current.getBoundingClientRect();
    setHover({ node: n, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
  };

  const isOn = (n) => n.rel === 'seed' || visible[n.rel];
  const isMatch = (n) => !matches || matches.has(n.id);
  const sel = selectedId && byId[selectedId];
  const k = view.w / home.w; // để chữ và nét không phình to khi phóng
  const timeline = Boolean(axes);

  return (
    <div ref={wrap} className="relative h-[540px] overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-800 sm:h-[620px]">
      <svg ref={svg} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
        role="img" aria-label="Biểu đồ trích dẫn">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M1 1L9 5L1 9" fill="none" stroke="#94a3b8" strokeWidth="1.6" />
          </marker>
        </defs>

        {/* Trục của bố cục thời gian */}
        {timeline && (
          <g fontSize={11 * k} fill="#64748b">
            <line x1={axes.x0} x2={axes.x1} y1={axes.yBase} y2={axes.yBase} stroke="#334155" strokeWidth={k} />
            {axes.yearTicks.map((t) => (
              <g key={t.v}>
                <line x1={t.x} x2={t.x} y1={axes.yBase} y2={axes.yBase - 560} stroke="#1e293b" strokeWidth={k} />
                <text x={t.x} y={axes.yBase + 18 * k} textAnchor="middle">{t.v}</text>
              </g>
            ))}
            {axes.citeTicks.map((t) => (
              <g key={t.v}>
                <line x1={axes.x0} x2={axes.x1} y1={t.y} y2={t.y} stroke="#1e293b" strokeDasharray={`${3 * k} ${4 * k}`} strokeWidth={k} />
                <text x={axes.x0 - 6 * k} y={t.y + 4 * k} textAnchor="end">{t.v >= 1000 ? `${t.v / 1000}k` : t.v}</text>
              </g>
            ))}
            <text x={axes.x1} y={axes.yBase + 34 * k} textAnchor="end" fill="#475569">Năm xuất bản →</text>
            <text x={axes.x0 - 6 * k} y={axes.citeTicks.at(-1)?.y - 14 * k} textAnchor="end" fill="#475569">Lượt trích dẫn ↑</text>
          </g>
        )}

        {/* Cạnh tới bài gốc: mờ, để không che các trích dẫn chéo */}
        <g>
          {edges.map((e, i) => {
            const a = byId[e.s], b = byId[e.t];
            if (!a || !b || !isOn(a) || !isOn(b)) return null;
            const hot = sel && (sel.id === a.id || sel.id === b.id);
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={REL[e.rel]?.color ?? '#64748b'} strokeWidth={(hot ? 1.8 : 0.7) * k}
              strokeOpacity={hot ? 0.8 : links.length ? 0.07 : isMatch(b) ? 0.28 : 0.06} />;
          })}
        </g>
        {/* Trích dẫn chéo giữa các bài: mũi tên từ bài trích dẫn tới bài được trích dẫn */}
        <g>
          {links.map((l, i) => {
            const a = byId[l.s], b = byId[l.t];
            if (!a || !b || !isOn(a) || !isOn(b)) return null;
            const hot = sel && (sel.id === a.id || sel.id === b.id);
            const dim = !isMatch(a) && !isMatch(b);
            const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, rb = radius(b) + 2;
            return <line key={i} x1={a.x} y1={a.y} x2={b.x - (dx / len) * rb} y2={b.y - (dy / len) * rb}
              stroke={hot ? '#f8fafc' : '#94a3b8'} strokeWidth={(hot ? 1.6 : 0.8) * k} strokeOpacity={hot ? 0.95 : dim ? 0.05 : 0.3}
              markerEnd={hot || !dim ? 'url(#arr)' : undefined} />;
          })}
        </g>
        <g>
          {nodes.filter(isOn).map((n) => {
            const r = radius(n);
            const st = screen[n.id]?.status;
            const dim = !isMatch(n) || st === 'exclude';
            const active = sel?.id === n.id;
            const top = insights?.top.has(n.id);
            return (
              <g key={n.id} data-node transform={`translate(${n.x} ${n.y})`} className="cursor-pointer"
                tabIndex={0} role="button" aria-label={n.title}
                onClick={() => onSelect(n.id)} onKeyDown={(e) => e.key === 'Enter' && onSelect(n.id)}
                onPointerEnter={(e) => showHover(n, e)} onPointerMove={(e) => showHover(n, e)} onPointerLeave={() => setHover(null)}
                opacity={dim ? 0.18 : 1}>
                {active && <circle r={r + 7 * k} fill="none" stroke="#fff" strokeWidth={2 * k} />}
                {st === 'include' && <circle r={r + 3.5 * k} fill="none" stroke="#34d399" strokeWidth={2.2 * k} />}
                {st === 'maybe' && <circle r={r + 3.5 * k} fill="none" stroke="#fbbf24" strokeWidth={2 * k} strokeDasharray={`${3 * k} ${2 * k}`} />}
                {top && !st && <circle r={r + 3.5 * k} fill="none" stroke="#fde047" strokeWidth={1.4 * k} />}
                <circle r={r} fill={REL[n.rel].color} stroke={n.cls.review ? '#fde68a' : '#0f172a'}
                  strokeWidth={(n.cls.review ? 1.4 : 1) * k} strokeDasharray={n.cls.review ? `${3 * k} ${2 * k}` : undefined} />
                {(labelled.has(n.id) || active) && !dim && (
                  <text y={-r - 6 * k} textAnchor="middle" fontSize={(n.rel === 'seed' ? 14 : 11.5) * k} fontWeight={600}
                    fill="#e2e8f0" stroke="#0f172a" strokeWidth={4 * k} paintOrder="stroke">
                    {n.rel === 'seed' ? 'Bài gốc' : nodeLabel(n)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Chú thích: một hàng ở đáy, bấm để ẩn/hiện từng nhóm */}
      <div className="absolute bottom-3 left-3 right-3 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1 text-xs text-slate-200">
          {Object.entries(REL).map(([key, r]) => (
            <button key={key} disabled={key === 'seed'} onClick={() => onToggle(key)} aria-pressed={key === 'seed' || visible[key]}
              className={`flex items-center gap-1.5 rounded-full bg-slate-900/85 px-2.5 py-1 ring-1 ring-white/10 ${key === 'seed' ? '' : 'hover:bg-slate-800'} ${key !== 'seed' && !visible[key] ? 'opacity-40' : ''}`}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
              {r.label}
            </button>
          ))}
          <span className="flex items-center gap-3 rounded-full bg-slate-900/85 px-2.5 py-1 text-slate-400 ring-1 ring-white/10">
            {insights && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full ring-[1.5px] ring-yellow-300" /> Nên đọc trước</span>}
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-emerald-400" /> Đã đưa vào</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-dashed border-amber-200" /> Nhãn cần kiểm tra</span>
          </span>
        </div>
        <p className="pointer-events-none text-[11px] text-slate-400">
          {insights ? `Mũi tên: bài này trích dẫn bài kia (${links.length} trích dẫn chéo) · kích thước nút = điểm liên quan` : 'Kích thước nút = số lượt trích dẫn'} · kéo để di chuyển, cuộn để phóng to
        </p>
      </div>

      <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
        {toolbar}
        <div className="flex flex-col overflow-hidden rounded-xl bg-slate-900/85 text-lg text-white ring-1 ring-white/10">
          <button onClick={() => zoom(1 / 1.3)} className="px-3 py-1.5 hover:bg-white/10" aria-label="Phóng to">+</button>
          <button onClick={() => zoom(1.3)} className="px-3 py-1.5 hover:bg-white/10" aria-label="Thu nhỏ">−</button>
          <button onClick={() => setView(home)} className="px-3 py-1.5 text-xs hover:bg-white/10" aria-label="Về ban đầu">⤢</button>
        </div>
      </div>
      {hover && (
        <div className="pointer-events-none absolute z-10 w-72 rounded-xl bg-white p-3 text-sm shadow-2xl"
          style={{ left: Math.min(hover.x + 14, hover.w - 300), top: hover.y + 14 }}>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: REL[hover.node.rel].color }}>
            {REL[hover.node.rel].label}{insights?.top.has(hover.node.id) ? ' · ★ nên đọc trước' : ''}
          </p>
          <p className="mt-0.5 line-clamp-3 font-semibold leading-snug text-ink">{hover.node.title}</p>
          <p className="mt-1 text-xs text-slate-500">{shortAuthors(hover.node.authors)} · {hover.node.year} · {fmtNum(hover.node.cites)} lượt trích dẫn</p>
          {insights?.stats[hover.node.id] && (
            <p className="mt-1 text-xs text-slate-600">
              Trong bản đồ: {insights.stats[hover.node.id].local} bài trích dẫn · cùng được trích dẫn với bài gốc: {insights.stats[hover.node.id].cocited} · chung tài liệu tham khảo: {insights.stats[hover.node.id].coupling}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
