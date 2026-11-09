import { useEffect, useState } from 'react';
import { listMine } from '../lib/storage';

// Danh sách "Bản đồ của tôi", tự cập nhật khi thêm/xóa (kể cả ở tab khác)
export function useMine() {
  const [list, setList] = useState(listMine);
  useEffect(() => {
    const refresh = () => setList(listMine());
    window.addEventListener('citenet:mine', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('citenet:mine', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  return list;
}
