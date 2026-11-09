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
        <h2 className="mb-4 text-lg font-extrabold">Bản đồ thông minh và "Nên đọc trước"</h2>
        <p className="text-sm text-slate-700">
          Chế độ <strong>Theo thời gian</strong> đặt bài cũ bên trái, bài mới bên phải, bài được trích dẫn nhiều ở trên cao. Mũi tên nối hai bài khi bài này
          trích dẫn bài kia (kể cả giữa các tài liệu tham khảo với nhau), nên bạn thấy được bài nào là "gốc rễ" của cả nhóm. Chế độ <strong>Theo nhóm</strong> giữ bố cục cũ của Citenet.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li><strong>Cùng được trích dẫn với bài gốc</strong>: trong số các bài trích dẫn bài gốc, bao nhiêu bài cũng trích dẫn bài này (co-citation). Cao nghĩa là người trong ngành hay đọc hai bài cùng nhau.</li>
          <li><strong>Bài trong bản đồ trích dẫn</strong>: bao nhiêu bài khác trong bản đồ trích dẫn bài này. Cao nghĩa là bài nền tảng của chủ đề, không chỉ nổi tiếng chung chung.</li>
          <li><strong>Tài liệu tham khảo chung với bài gốc</strong>: số tài liệu mà cả hai bài cùng trích dẫn (bibliographic coupling). Cao nghĩa là cùng nền tảng lý thuyết.</li>
        </ul>
        <p className="mt-3 text-sm text-slate-700">Điểm "Nên đọc trước" = 3 × cùng được trích dẫn + 2 × trích dẫn trong bản đồ + tài liệu tham khảo chung. 10 bài điểm cao nhất có vòng vàng trên biểu đồ.</p>
      </section>

      <section className={card}>
        <h2 className="mb-4 text-lg font-extrabold">Sàng lọc và đưa vào Zotero</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Với mỗi bài, bấm <strong>✓ Đưa vào</strong>, <strong>? Cân nhắc</strong> hoặc <strong>✕ Loại</strong> (trên danh sách hoặc trong bảng chi tiết). Có thể ghi chú lý do. Mọi thứ chỉ lưu trên trình duyệt của bạn.</li>
          <li>Bấm <strong>Sao chép DOI cho Zotero</strong>: web chép DOI của các bài đã đưa vào, mỗi DOI một dòng.</li>
          <li>Trong Zotero, bấm nút <strong>cây đũa thần</strong> (Add Item by Identifier), dán (Ctrl+V) rồi Enter. Zotero tự lấy đầy đủ thông tin (tập, số, trang…) cho từng bài.</li>
          <li>Bài không có DOI: dùng nút RIS/BibTeX cạnh đó, rồi trong Zotero chọn File → Import.</li>
        </ol>
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
        <h2 className="mb-4 text-lg font-extrabold">Dựng bản đồ cho DOI của bạn</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>Vào <strong>Phân tích DOI</strong>, dán DOI (hoặc link doi.org) rồi bấm <strong>Dựng bản đồ</strong>.</li>
          <li>Trình duyệt tự lấy dữ liệu, thường mất 10–60 giây tùy số tài liệu tham khảo. Có thể bấm Hủy bất cứ lúc nào.</li>
          <li>Kết quả được lưu vào <strong>Bản đồ của tôi</strong> trên trình duyệt này. Dùng nút <strong>Sao lưu</strong> để chuyển sang máy khác.</li>
        </ol>
        <h3 className="mb-2 mt-5 font-bold text-ink">API key OpenAlex</h3>
        <p className="text-sm text-slate-700">
          Từ tháng 2/2026, OpenAlex yêu cầu API key (miễn phí) để có hạn mức truy cập hằng ngày đủ dùng. Không có key, web vẫn chạy nhưng có thể
          báo hết hạn mức sau vài lần phân tích. Tạo tài khoản tại openalex.org, lấy key trong phần cài đặt tài khoản rồi dán vào ô API key ở trang
          Phân tích DOI. Key chỉ lưu trong trình duyệt của bạn và chỉ được gửi tới api.openalex.org.
        </p>
        <h3 className="mb-2 mt-5 font-bold text-ink">Quyền riêng tư</h3>
        <p className="text-sm text-slate-700">
          Web không có máy chủ riêng. DOI bạn nhập, kết quả và API key không được gửi tới chủ web. Chỉ những bản đồ trong Bộ sưu tập (do chủ web chọn) là công khai.
        </p>
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
