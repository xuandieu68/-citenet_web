// Các hàm định dạng dùng chung

// "Nguyễn A, Trần B, Lê C, Phạm D" -> "Nguyễn A, Trần B et al."
export function shortAuthors(authors = [], max = 2) {
  if (!authors.length) return 'Không rõ tác giả';
  return authors.length > max ? `${authors.slice(0, max).join(', ')} et al.` : authors.join(', ');
}

// Nhãn ngắn trên biểu đồ: "Baker 2016"
export function nodeLabel(n) {
  const last = (n.authors?.[0] || '').split(' ').slice(-1)[0];
  return `${last || n.title.split(' ')[0]} ${n.year ?? ''}`.trim();
}

export const fmtNum = (n) => (n ?? 0).toLocaleString('vi-VN');

export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Bỏ dấu tiếng Việt + chữ thường để tìm kiếm
export const norm = (s = '') =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase();

export function firstSentences(s = '', n = 2) {
  const parts = s.match(/[^.!?]+[.!?]+(\s|$)/g);
  return parts ? parts.slice(0, n).join('').trim() : s;
}

export const doiUrl = (doi) => (doi ? `https://doi.org/${doi}` : '');
