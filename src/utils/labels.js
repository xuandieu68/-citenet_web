// Nhãn tiếng Việt cho các giá trị Citenet trả về

export const REL = {
  seed: { label: 'Bài gốc', desc: 'DOI bạn nhập vào', dot: 'bg-rel-seed', text: 'text-blue-700', soft: 'bg-blue-50 text-blue-800 ring-blue-200', color: '#3b82f6' },
  backward: { label: 'Tài liệu tham khảo', desc: 'Bài gốc trích dẫn bài này (backward)', dot: 'bg-rel-backward', text: 'text-emerald-700', soft: 'bg-emerald-50 text-emerald-800 ring-emerald-200', color: '#10b981' },
  forward: { label: 'Bài trích dẫn', desc: 'Bài này trích dẫn bài gốc (forward)', dot: 'bg-rel-forward', text: 'text-amber-700', soft: 'bg-amber-50 text-amber-800 ring-amber-200', color: '#f59e0b' },
  related: { label: 'Bài liên quan', desc: 'OpenAlex gợi ý là liên quan', dot: 'bg-rel-related', text: 'text-pink-700', soft: 'bg-pink-50 text-pink-800 ring-pink-200', color: '#ec4899' },
};

export const DESIGN = {
  empirical: 'Thực nghiệm',
  review: 'Tổng quan',
  'systematic review': 'Tổng quan hệ thống',
  survey: 'Khảo sát',
  'case study': 'Nghiên cứu tình huống',
  framework: 'Khung lý thuyết',
};

export const TOPIC = { finance: 'Tài chính', management: 'Quản trị', 'innovation management': 'Quản trị đổi mới' };
export const METHOD = { other: 'Khác', 'machine learning': 'Học máy', 'decision framework': 'Khung ra quyết định' };
export const DIRECTION = { mixed: 'Hỗn hợp', positive: 'Tích cực', negative: 'Tiêu cực' };

export const DOMAIN = {
  'finance / management / machine learning': 'Tài chính · Quản trị · Học máy',
  'general research': 'Nghiên cứu chung',
};

export const label = (dict, v) => (v ? dict[v] ?? v : '—');
