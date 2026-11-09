import { useEffect, useState } from 'react';

// Tải file JSON trong public/data, nhớ kết quả để các trang dùng lại (không tải 2 lần)
const cache = new Map();

function load(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(`${import.meta.env.BASE_URL}data/${path}`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    );
  }
  return cache.get(path);
}

export function useJson(path) {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ data: null, error: null });
    if (!path) return;
    load(path).then(
      (data) => alive && setState({ data, error: null }),
      (error) => { cache.delete(path); alive && setState({ data: null, error }); }
    );
    return () => { alive = false; };
  }, [path]);
  return { ...state, loading: !state.data && !state.error };
}

export const useIndex = () => useJson('index.json');
export const usePapers = () => useJson('papers.json');
export const useMap = (slug) => useJson(slug ? `maps/${slug}.json` : null);
