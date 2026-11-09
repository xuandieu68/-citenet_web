import { useEffect, useState } from 'react';
import { attachRefs, fetchRefs, hasRefs } from '../lib/insights';
import { createFetcher } from '../lib/citenet';
import { getApiKey } from '../lib/storage';

/**
 * Bảo đảm mỗi nút có refs (danh sách tài liệu mà bài đó trích dẫn).
 * Bản đồ tạo bằng web đã có sẵn. Bản đồ cũ / Bộ sưu tập: lấy bù từ OpenAlex (50 bài một lượt), rồi nhớ lại trong trình duyệt.
 */
export function useMapRefs(web) {
  const ready = web && hasRefs(web.nodes);
  const [state, setState] = useState({ nodes: ready ? web.nodes : null, status: ready ? 'ok' : 'idle' });

  useEffect(() => {
    if (!web) return;
    if (hasRefs(web.nodes)) { setState({ nodes: web.nodes, status: 'ok' }); return; }
    const cacheKey = `citenet:refs:${web.slug}`;
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached) { setState({ nodes: attachRefs(web.nodes, cached), status: 'ok' }); return; }
    } catch { /* bỏ qua */ }
    let alive = true;
    setState({ nodes: web.nodes, status: 'loading' });
    fetchRefs(web.nodes, createFetcher({ apiKey: getApiKey() }))
      .then((refs) => {
        if (!alive) return;
        try { localStorage.setItem(cacheKey, JSON.stringify(refs)); } catch { /* bỏ qua */ }
        setState({ nodes: attachRefs(web.nodes, refs), status: 'ok' });
      })
      .catch((e) => alive && setState({ nodes: web.nodes, status: 'error', error: e.message }));
    return () => { alive = false; };
  }, [web]);

  return state;
}
