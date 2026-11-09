// Lưu trữ trong trình duyệt của người dùng (localStorage).
// Không có gì được gửi lên máy chủ: API key và bản đồ tự tạo chỉ nằm trên máy người dùng.
const KEY_API = 'citenet:openalexKey';
const KEY_INDEX = 'citenet:mine';
const mapKey = (slug) => `citenet:map:${slug}`;

function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; } // hết dung lượng hoặc trình duyệt chặn lưu trữ
}

export const getApiKey = () => read(KEY_API, '');
export const setApiKey = (k) => (k ? write(KEY_API, k.trim()) : (localStorage.removeItem(KEY_API), true));

/** Danh sách bản đồ đã tạo (chỉ thông tin tóm tắt), mới nhất trước */
export const listMine = () => read(KEY_INDEX, []);
export const getMine = (slug) => read(mapKey(slug), null);

/** Lưu một bản đồ; trả về false nếu không đủ dung lượng */
export function saveMine(meta, web) {
  if (!write(mapKey(meta.slug), web)) return false;
  const list = listMine().filter((m) => m.slug !== meta.slug);
  if (!write(KEY_INDEX, [meta, ...list])) { localStorage.removeItem(mapKey(meta.slug)); return false; }
  window.dispatchEvent(new Event('citenet:mine'));
  return true;
}

export function deleteMine(slug) {
  try { localStorage.removeItem(mapKey(slug)); } catch { /* bỏ qua */ }
  write(KEY_INDEX, listMine().filter((m) => m.slug !== slug));
  window.dispatchEvent(new Event('citenet:mine'));
}

/** Sao lưu toàn bộ bản đồ của tôi ra một file JSON (để chuyển sang máy khác) */
export function exportAll() {
  return { app: 'citenet-web', version: 1, exportedAt: new Date().toISOString(), maps: listMine().map((m) => ({ meta: m, web: getMine(m.slug) })).filter((x) => x.web) };
}

export function importAll(json) {
  if (json?.app !== 'citenet-web' || !Array.isArray(json.maps)) throw new Error('File không phải bản sao lưu của Citenet Web.');
  let ok = 0;
  for (const { meta, web } of json.maps) if (meta?.slug && web?.nodes && saveMine(meta, web)) ok++;
  return ok;
}

/** Ước lượng dung lượng đã dùng (KB) */
export function usageKb() {
  let n = 0;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('citenet:')) n += (localStorage.getItem(k) || '').length; } } catch { /* bỏ qua */ }
  return Math.round((n * 2) / 1024);
}
