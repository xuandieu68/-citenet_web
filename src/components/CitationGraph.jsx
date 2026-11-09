import { useEffect, useMemo, useRef, useState } from 'react';
import { REL } from '../utils/labels';
import { fmtNum, nodeLabel, shortAuthors } from '../utils/format';

const PAD = 70;
const radius = (n) => (n.rel === 'seed' ? 18 : 5 + Math.min(10, 2.4 * Math.log10((n.cites || 0) + 1)));

/**
 * Biểu đồ trích dẫn vẽ bằng SVG.
 *  - Vị trí nút lấy từ Citenet (x, y), nên giống hệt graph.html gốc
 *  - Kéo để di chuyển, cuộn chuột / nút +/− để phóng to, bấm chú thích để ẩn/hiện nhóm
 *  - Rê chuột vào nút: tooltip; bấm vào nút: onSelect(id)
 */
export default function CitationGraph({ nodes, edges, selectedId, onSelect, visible, onToggle, matches }) {
  const wrap = useRef(null);
  const svg = useRef(null);
  const drag = useRef(null);
  const [hover, setHover] = useState(null); // { node, x, y }

  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const home = useMemo(() => {
    const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
    const x = Math.min(...xs) - PAD, y = Math.min(...ys) - PAD;
    return { x, y, w: Math.max(...xs) + PAD - x, h: Math.max(...ys) + PAD - y };
  }, [nodes]);
  const [view, setView] = useState(home);
  useEffect(() => setView(home), [home]);

  // Nhãn chữ: bài gốc + 6 bài được trích dẫn nhiều nhất + bài đang chọn
  const labelled = useMemo(() => {
    const top = [...nodes].filter((n) => n.rel !== 'seed').sort((a, b) => b.cites - a.cites).slice(0, 6);
    return new Set([...top.map((n) => n.id), ...nodes.filter((n) => n.rel === 'seed').map((n) => n.id)]);
  }, [nodes]);

  const zoom = (factor, cx = view.x + view.w / 2, cy = view.y + view.h / 2) => {
    setView((v) => {
      const w = Math.min(home.w * 3, Math.max(home.w / 8, v.w * factor));
      const h = (w / v.w) * v.h;
      return { x: cx - ((cx - v.x) * w) / v.w, y: cy - ((cy - v.y) * h) / v.h, w, h };
    });
  };

  // Đổi toạ độ chuột (px) sang toạ độ biểu đồ
  const toGraph = (clientX, clientY) => {
    const r = svg.current.getBoundingClientRect();
    const s = Math.max(view.w / r.width, view.h / r.height);
    const offX = (r.width * s - view.w) / 2, offY = (r.height * s - view.h) / 2;
    return { x: view.x - offX + (clientX - r.left) * s, y: view.y - offY + (clientY - r.top) * s, s };
  };

  // Cuộn chuột để phóng to (cần listener "không thụ động" để chặn trang cuộn theo)
  useEffect(() => {
    const el = svg.current;
    const onWheel = (e) => {
      e.preventDefault();
      const p = toGraph(e.clientX, e.clientY);
      zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    };
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

  return (
    <div ref={wrap} className="relative h-[520px] overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-800 sm:h-[600px]">
      <svg
        ref={svg}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        role="img"
        aria-label="Biểu đồ trích dẫn"
      >
        <g>
          {edges.map((e, i) => {
            const a = byId[e.s], b = byId[e.t];
            if (!a || !b || !isOn(a) || !isOn(b)) return null;
            const hot = sel && (sel.id === a.id || sel.id === b.id);
            return (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={REL[e.rel]?.color ?? '#64748b'} strokeWidth={hot ? 2 : 0.8}
                strokeOpacity={hot ? 0.9 : isMatch(b) ? 0.28 : 0.06} />
            );
          })}
        </g>
        <g>
          {nodes.filter(isOn).map((n) => {
            const r = radius(n);
            const dim = !isMatch(n);
            const active = sel?.id === n.id;
            return (
              <g key={n.id} data-node transform={`translate(${n.x} ${n.y})`} className="cursor-pointer"
                tabIndex={0} role="button" aria-label={n.title}
                onClick={() => onSelect(n.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(n.id)}
                onPointerEnter={(e) => showHover(n, e)}
                onPointerMove={(e) => showHover(n, e)}
                onPointerLeave={() => setHover(null)}
                opacity={dim ? 0.15 : 1}>
                {active && <circle r={r + 7} fill="none" stroke="#fff" strokeWidth={2} />}
                <circle r={r} fill={REL[n.rel].color} stroke={n.cls.review ? '#fde68a' : '#0f172a'}
                  strokeWidth={n.cls.review ? 1.6 : 1} strokeDasharray={n.cls.review ? '3 2' : undefined} />
                {(labelled.has(n.id) || active) && !dim && (
                  <text y={-r - 6} textAnchor="middle" fontSize={n.rel === 'seed' ? 15 : 12} fontWeight={600}
                    fill="#e2e8f0" stroke="#0f172a" strokeWidth={4} paintOrder="stroke">
                    {n.rel === 'seed' ? 'Bài gốc' : nodeLabel(n)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Chú thích: bấm để ẩn/hiện từng nhóm */}
      <div className="absolute left-3 top-3 space-y-1 rounded-xl bg-slate-900/85 p-2 text-xs text-slate-200 ring-1 ring-white/10 backdrop-blur">
        {Object.entries(REL).map(([k, r]) => (
          <button key={k} disabled={k === 'seed'} onClick={() => onToggle(k)} aria-pressed={k === 'seed' || visible[k]}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left ${k === 'seed' ? '' : 'hover:bg-white/10'} ${k !== 'seed' && !visible[k] ? 'opacity-40' : ''}`}>
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
            {r.label}
          </button>
        ))}
        <p className="flex items-center gap-2 px-2 pt-1 text-slate-400">
          <span className="h-2.5 w-2.5 rounded-full border border-dashed border-amber-200" /> Cần kiểm tra
        </p>
      </div>

      {/* Nút phóng to / thu nhỏ */}
      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-xl bg-slate-900/85 text-lg text-white ring-1 ring-white/10">
        <button onClick={() => zoom(1 / 1.3)} className="px-3 py-1.5 hover:bg-white/10" aria-label="Phóng to">+</button>
        <button onClick={() => zoom(1.3)} className="px-3 py-1.5 hover:bg-white/10" aria-label="Thu nhỏ">−</button>
        <button onClick={() => setView(home)} className="px-3 py-1.5 text-xs hover:bg-white/10" aria-label="Về ban đầu">⤢</button>
      </div>
      <p className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-slate-400">Kéo để di chuyển · cuộn để phóng to · kích thước nút = số lượt trích dẫn</p>

      {/* Tooltip khi rê chuột vào nút */}
      {hover && (
        <div className="pointer-events-none absolute z-10 w-72 rounded-xl bg-white p-3 text-sm shadow-2xl"
          style={{ left: Math.min(hover.x + 14, hover.w - 300), top: hover.y + 14 }}>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: REL[hover.node.rel].color }}>{REL[hover.node.rel].label}</p>
          <p className="mt-0.5 line-clamp-3 font-semibold leading-snug text-ink">{hover.node.title}</p>
          <p className="mt-1 text-xs text-slate-500">{shortAuthors(hover.node.authors)} · {hover.node.year} · {fmtNum(hover.node.cites)} lượt trích dẫn</p>
        </div>
      )}
    </div>
  );
}
