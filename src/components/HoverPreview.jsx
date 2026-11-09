import { useEffect, useRef, useState } from 'react';

const DELAY = 250; // ms: rê chuột 0,25 giây mới mở, tránh nhấp nháy khi lướt qua

/**
 * Bọc một thẻ bất kỳ để có "thẻ xem nhanh" khi rê chuột (chỉ với chuột, không với cảm ứng).
 *  - children: thẻ gốc
 *  - preview: hàm trả về nội dung thẻ xem nhanh
 *  - width: 'double' = rộng gấp đôi thẻ gốc (dùng trong lưới), hoặc số px cố định
 *  - placement: 'over' = đè lên thẻ, mở sang phải (hết chỗ thì sang trái) — hợp với lưới thẻ
 *               'below' = hiện ngay dưới, canh phải — hợp với dòng rộng hết màn hình (không che dòng gốc)
 */
export default function HoverPreview({ children, preview, width = 'double', placement = 'over', className = '' }) {
  const ref = useRef(null);
  const timer = useRef(null);
  const [state, setState] = useState(null); // null | { side, w }

  useEffect(() => () => clearTimeout(timer.current), []);

  const onEnter = (e) => {
    if (e.pointerType !== 'mouse') return;
    timer.current = setTimeout(() => {
      const r = ref.current.getBoundingClientRect();
      const w = width === 'double' ? r.width * 2 + 16 : width;
      const side = r.left + w <= window.innerWidth - 8 ? 'left' : 'right';
      setState({ side, w });
    }, DELAY);
  };
  const onLeave = () => {
    clearTimeout(timer.current);
    setState(null);
  };

  return (
    <div ref={ref} className={`relative ${className}`} onPointerEnter={onEnter} onPointerLeave={onLeave}>
      {children}
      {state && (
        <div
          role="tooltip"
          style={{ width: state.w }}
          className={`preview-pop absolute z-30 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 ${
            placement === 'below'
              ? 'right-4 top-[calc(100%-6px)] origin-top-right'
              : `top-0 min-h-full ${state.side === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'}`
          }`}
        >
          {preview()}
        </div>
      )}
    </div>
  );
}
