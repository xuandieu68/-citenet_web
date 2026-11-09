import { useEffect } from 'react';
import { HashRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useIndex } from './hooks/useData';
import { fmtDate } from './utils/format';
import Home from './pages/Home';
import Maps from './pages/Maps';
import MapDetail from './pages/MapDetail';
import Papers from './pages/Papers';
import Guide from './pages/Guide';
import Analyze from './pages/Analyze';
import MyMaps from './pages/MyMaps';
import MyMap from './pages/MyMap';
import { useMine } from './hooks/useMine';

// HashRouter: địa chỉ dạng /#/maps để GitHub Pages không báo 404 khi tải lại trang con
const NAV = [
  { to: '/analyze', label: 'Phân tích DOI' },
  { to: '/mine', label: 'Bản đồ của tôi', mine: true },
  { to: '/maps', label: 'Bộ sưu tập' },
  { to: '/papers', label: 'Tài liệu' },
  { to: '/guide', label: 'Hướng dẫn' },
];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-9 w-9" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#1e3a8a" />
      <g stroke="#93c5fd" strokeWidth="1.3" opacity=".8"><path d="M16 16 7 9M16 16l9-6M16 16l1 10" /></g>
      <circle cx="16" cy="16" r="4.5" fill="#3b82f6" /><circle cx="7" cy="9" r="2.5" fill="#10b981" />
      <circle cx="25" cy="10" r="2.5" fill="#f59e0b" /><circle cx="17" cy="26" r="2.5" fill="#ec4899" />
    </svg>
  );
}

function Header() {
  const mine = useMine();
  const items = NAV.map((n) => (
    <NavLink key={n.to} to={n.to} end={n.end} className={link}>
      {n.label}
      {n.mine && mine.length > 0 && <span className="ml-1.5 rounded-full bg-brand-light px-1.5 text-[11px] text-brand-dark">{mine.length}</span>}
    </NavLink>
  ));
  return <HeaderBar items={items} />;
}

const link = ({ isActive }) =>
  `whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-brand-dark text-white' : 'text-slate-600 hover:bg-slate-100'}`;

function HeaderBar({ items }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <Logo />
          <span className="leading-tight">
            <span className="block text-lg font-extrabold text-ink">Citenet</span>
            <span className="block text-xs text-slate-500">Bản đồ trích dẫn cho literature review</span>
          </span>
        </Link>
        <nav className="ml-auto hidden gap-1 lg:flex">{items}</nav>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">{items}</nav>
    </header>
  );
}

function Footer() {
  const { data } = useIndex();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:justify-between">
        <p>
          Công cụ chạy hoàn toàn trong trình duyệt. Dữ liệu từ <a className="underline hover:text-brand" href="https://www.crossref.org" target="_blank" rel="noreferrer">Crossref</a> và{' '}
          <a className="underline hover:text-brand" href="https://openalex.org" target="_blank" rel="noreferrer">OpenAlex</a>, xử lý bằng Citenet.
          Kiểm tra lại tài liệu quan trọng trước khi trích dẫn.
        </p>
        {data && <p>Cập nhật gần nhất: {fmtDate(data.updatedAt)}</p>}
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Header />
      <main className="mx-auto min-h-[70vh] max-w-7xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/maps" element={<Maps />} />
          <Route path="/map/:slug" element={<MapDetail />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/mine" element={<MyMaps />} />
          <Route path="/mine/:slug" element={<MyMap />} />
          <Route path="/papers" element={<Papers />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="*" element={<p className="py-10 text-center">Không tìm thấy trang. <Link to="/" className="text-brand underline">Về trang chủ</Link></p>} />
        </Routes>
      </main>
      <Footer />
    </HashRouter>
  );
}
