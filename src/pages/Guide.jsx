import { REL } from '../utils/labels';

const METRICS = [
  ['Tài liệu tham khảo (ứng viên)', 'Số reference lấy được metadata và đưa vào biểu đồ. Số trong ngoặc là tổng reference thu được từ Crossref/OpenAlex trước khi tra cứu, nên hai số có thể khác nhau.'],
  ['Bài trích dẫn', 'Các bài đang trích dẫn bài gốc, giới hạn tối đa 20 bài (ưu tiên bài được trích dẫn nhiều).'],
  ['Bài liên quan', 'Tối đa 10 bài do OpenAlex gợi ý là liên quan.'],
  ['Có tóm tắt', 'Tỉ lệ tài liệu có tóm tắt (abstract) để gắn nhãn sơ bộ.'],
  ['Cần kiểm tra', 'Tài liệu có độ tin cậy nhãn dưới 0,74 hoặc thiếu thông tin. Nên đọc lại trước khi đưa vào tổng quan tài liệu.'],
];

const LIMITS = [
  'Kết quả phụ thuộc độ bao phủ và thời điểm cập nhật của Crossref/OpenAlex. Số lượt trích dẫn ở đây không phải con số chính thức duy nhất.',
  'Citenet không tải PDF và không đọc toàn văn. Chủ đề, phương pháp và thiết kế được suy ra từ tiêu đề/tóm tắt bằng luật từ khóa.',
  'Bản đồ chỉ mở rộng một tầng quanh bài gốc, không phải toàn bộ tài liệu của một chủ đề.',
  'Không dùng kết quả để đưa ra kết luận nhân quả. Tài liệu giữ lại cần được đọc và kiểm tra thiết kế, mẫu, dữ liệu.',
];

export default function Guide() {
  const card = 'rounded-2xl bg-white p-6 ring-1 ring-slate-200';
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold text-ink">Hướng dẫn</h1>
        <p className="mt-2 text-slate-600">
          Citenet giúp khởi động literature review và khám phá tài liệu. Công cụ không thay thế systematic review, việc đọc toàn văn hay kiểm tra thủ công của nhà nghiên cứu.
        </p>
      </header>

      <section className={card}>
        <h2 className="mb-4 text-lg font-extrabold">Đọc biểu đồ</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {Object.entries(REL).map(([k, r]) => (
            <li key={k} className="flex gap-3">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: r.color }} />
              <span><strong>{r.label}</strong><br /><span className="text-sm text-slate-600">{r.desc}</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-600">
          Kích thước nút tăng theo số lượt trích dẫn. Viền nét đứt màu vàng là tài liệu cần kiểm tra. Kéo để di chuyển, cuộn chuột để phóng to,
          bấm vào chú thích để ẩn/hiện từng nhóm, bấm vào nút để xem chi tiết. Ô lọc bên dưới biểu đồ sẽ làm mờ các nút không khớp.
        </p>
      </section>

      <section className={card}>
        <h2 className="mb-4 text-lg font-extrabold">Ý nghĩa các con số</h2>
        <dl className="space-y-3">
          {METRICS.map(([k, v]) => (
            <div key={k}><dt className="font-bold text-ink">{k}</dt><dd className="text-sm text-slate-600">{v}</dd></div>
          ))}
        </dl>
      </section>

      <section className={card}>
        <h2 className="mb-4 text-lg font-extrabold">File tải về</h2>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-slate-100">
            {[
              ['CSV', 'Mở bằng Excel để lọc, sắp xếp và rà soát danh sách bài.'],
              ['RIS', 'Import vào Zotero, Mendeley hoặc EndNote.'],
              ['BibTeX', 'Dùng trong LaTeX / Overleaf.'],
              ['Báo cáo', 'DOI, bài gốc, quy mô biểu đồ, độ phủ tóm tắt, số bài cần kiểm tra, thời gian chạy.'],
            ].map(([k, v]) => <tr key={k}><td className="py-2 pr-4 font-bold">{k}</td><td className="py-2 text-slate-600">{v}</td></tr>)}
          </tbody>
        </table>
      </section>

      <section className={card}>
        <h2 className="mb-4 text-lg font-extrabold">Giới hạn quan trọng</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">{LIMITS.map((l) => <li key={l}>{l}</li>)}</ul>
        <p className="mt-4 text-sm text-slate-600">
          Trước khi trích dẫn theo APA 7, hãy xác minh tài liệu quan trọng qua trang nhà xuất bản, DOI và Zotero/Scite.
        </p>
      </section>

      <section className={card}>
        <h2 className="mb-4 text-lg font-extrabold">Thêm một bản đồ mới</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Chạy Citenet trên máy với DOI mới, ví dụ <code className="rounded bg-slate-100 px-1">.\run_citenet.ps1 "10.1016/j.bir.2024.04.014"</code>.</li>
          <li>Trong thư mục web, chạy <code className="rounded bg-slate-100 px-1">python scripts/build_data.py "&lt;đường dẫn outputs/Citenet&gt;"</code>.</li>
          <li>Commit và push lên GitHub. Web tự cập nhật sau khoảng 30 giây.</li>
        </ol>
      </section>

      <section className={card}>
        <h2 className="mb-2 text-lg font-extrabold">Nguồn dữ liệu</h2>
        <p className="text-sm text-slate-600">
          <a href="https://www.crossref.org" className="text-brand underline" target="_blank" rel="noreferrer">Crossref</a>: DOI, metadata, danh sách tài liệu tham khảo (độ phủ khác nhau giữa các nhà xuất bản).{' '}
          <a href="https://openalex.org" className="text-brand underline" target="_blank" rel="noreferrer">OpenAlex</a>: metadata, tóm tắt, mạng trích dẫn, số lượt trích dẫn và bài liên quan.
          Ngày tạo của từng bản đồ ghi trên trang bản đồ đó.
        </p>
      </section>
    </div>
  );
}
