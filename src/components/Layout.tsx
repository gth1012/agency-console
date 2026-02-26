import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useEffect, useState } from 'react';

const menuItems = [
  {
    section: '메인',
    items: [
      { path: '/', label: '대시보드', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      )},
    ],
  },
  {
    section: '기능',
    items: [
      { path: '/series', label: '시리즈', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
      )},
      { path: '/activation', label: '정품등록', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
      )},
      { path: '/download', label: '다운로드', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      )},
    ],
  },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const currentLabel = menuItems
    .flatMap((s) => s.items)
    .find((m) => isActive(m.path))?.label || '';

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-geo-main">
      <aside className="w-[220px] min-h-screen bg-geo-sidebar border-r border-geo-border flex flex-col fixed z-10">
        <div className="px-5 py-6 flex items-center gap-2.5 border-b border-geo-border">
          <div className="w-8 h-8 bg-gradient-to-br from-status-purple to-status-blue rounded-lg flex items-center justify-center text-sm font-bold text-white">
            A
          </div>
          <span className="text-base font-semibold tracking-tight text-txt-primary">Agency Console</span>
        </div>

        <nav className="p-2 flex-1 flex flex-col gap-0.5">
          {menuItems.map((section) => (
            <div key={section.section}>
              <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold text-txt-muted tracking-widest uppercase">
                {section.section}
              </div>
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    isActive(item.path)
                      ? 'bg-geo-card text-txt-primary font-medium'
                      : 'text-txt-secondary hover:bg-geo-card hover:text-txt-primary'
                  }`}
                >
                  {isActive(item.path) && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-status-blue rounded-r-full" />
                  )}
                  <div className="flex items-center justify-center text-txt-secondary group-hover:text-txt-primary">
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-geo-border flex flex-col gap-0.5">
          <div className="px-3 py-2.5 text-sm text-txt-secondary">
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-txt-secondary hover:bg-geo-card hover:text-txt-primary transition-all duration-150"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      <main className="ml-[220px] flex-1 flex flex-col">
        <header className="h-16 bg-geo-card border-b border-geo-border flex items-center px-8">
          <h1 className="text-xl font-semibold text-txt-primary">{currentLabel || 'Agency Console'}</h1>
        </header>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
