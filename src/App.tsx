import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  LayoutDashboard,
  Users,
  Globe2,
  CalendarDays,
  ListChecks,
  HeartHandshake,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  Flower2,
  ArrowRight,
  Check,
  LoaderCircle,
  BriefcaseBusiness,
} from 'lucide-react';
import { AppContext, api, Brand, dateLabel, daysUntil, useApp } from './lib';
import type { Workspace } from './types';
import { Auth, Onboarding } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Guests } from './pages/Guests';
import { Planning, Events, BudgetPage, SettingsPage, Website } from './pages/Planning';
import { Vendors, VendorWorkspace } from './pages/Vendors';
import { Invitation } from './pages/Invitation';
import { DemoBar } from './DemoBar';

const navigation = [
  ['/dashboard', 'Overview', LayoutDashboard],
  ['/guests', 'Guest list', Users],
  ['/website', 'Wedding website', Globe2],
  ['/events', 'Events', CalendarDays],
  ['/planning', 'Checklist', ListChecks],
  ['/vendors', 'Vendors', HeartHandshake],
  ['/budget', 'Budget', Wallet],
] as const;
export default function App() {
  const [path, setPath] = useState(window.location.pathname),
    [data, setData] = useState<Workspace | null>(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null),
    [menu, setMenu] = useState(false);
  const navigate = useCallback((next: string) => {
    window.history.pushState({}, '', next);
    setPath(next);
    setMenu(false);
    window.scrollTo(0, 0);
  }, []);
  const notify = useCallback((text: string, error = false) => setToast({ text, error }), []);
  const reload = useCallback(async () => {
    try {
      setData(await api('/workspace'));
      setLoadError('');
    } catch (error: any) {
      if (error.status === 401) setData(null);
      else {
        setLoadError(error.message);
        throw error;
      }
    }
  }, []);
  useEffect(() => {
    reload()
      .catch(() => {})
      .finally(() => setLoading(false));
    const pop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, [reload]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.error ? 10000 : 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!data) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') reload().catch(() => {});
    };
    const timer = setInterval(refresh, 20000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [!!data, reload]);
  const mutate = async (url: string, method = 'POST', body: unknown = {}, message?: string) => {
    try {
      const result = await api(url, method, body);
      await reload();
      if (message) notify(message);
      return result;
    } catch (error: any) {
      notify(error.message, true);
      return null;
    }
  };
  const authDone = async () => {
    await reload();
    if (!path.startsWith('/join/')) navigate('/dashboard');
  };
  if (path.startsWith('/invite/') || path.startsWith('/w/')) return <Invitation path={path} />;
  if (loading)
    return (
      <div className="loading-screen">
        <Brand />
        <LoaderCircle size={24} className="spin" />
        <p>Making room for your big day…</p>
      </div>
    );
  if (loadError && !data)
    return (
      <div className="error-page">
        <Brand />
        <h1>We couldn’t connect.</h1>
        <p>{loadError}</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  if (!data) return <Auth onDone={authDone} joining={path.startsWith('/join/')} />;
  return (
    <AppContext.Provider value={{ data, reload, navigate, mutate, notify }}>
      {path.startsWith('/join/') ? (
        <Join path={path} />
      ) : data.user.role === 'couple' && !data.wedding ? (
        <Onboarding />
      ) : (
        <div className="app-shell">
          {menu && (
            <button
              className="sidebar-scrim"
              aria-label="Close navigation"
              onClick={() => setMenu(false)}
            />
          )}
          <aside className={`sidebar ${menu ? 'open' : ''}`}>
            <Brand />
            <div className="workspace-label">
              {data.user.role === 'vendor' ? 'YOUR BUSINESS' : 'YOUR WEDDING SPACE'}
            </div>
            <nav aria-label="Main navigation">
              {data.user.role === 'couple'
                ? navigation.map(([url, label, Icon]) => (
                    <button
                      key={url}
                      className={`nav-item ${path === url || (path === '/' && url === '/dashboard') ? 'active' : ''}`}
                      onClick={() => navigate(url)}
                    >
                      <Icon size={19} />
                      {label}
                      {url === '/guests' && !!data.wedding?.guests.length && (
                        <span className="nav-count">{data.wedding.guests.length}</span>
                      )}
                    </button>
                  ))
                : [
                    ['/dashboard', 'Enquiries', BriefcaseBusiness],
                    ['/profile', 'Business profile', Flower2],
                  ].map(([url, label, Icon]: any) => (
                    <button
                      key={url}
                      className={`nav-item ${path === url ? 'active' : ''}`}
                      onClick={() => navigate(url)}
                    >
                      <Icon size={19} />
                      {label}
                    </button>
                  ))}
            </nav>
            <div className="sidebar-bottom">
              {data.wedding && (
                <div className="countdown-card">
                  <Flower2 size={27} strokeWidth={1.2} />
                  <span>
                    <strong>{daysUntil(data.wedding.date)} days</strong>
                    <small>until your next chapter</small>
                  </span>
                </div>
              )}
              {data.user.role === 'couple' && (
                <button
                  className={`nav-item ${path === '/settings' ? 'active' : ''}`}
                  onClick={() => navigate('/settings')}
                >
                  <Settings size={19} />
                  Settings
                </button>
              )}
              <div className="user-profile">
                <div className="avatar">{data.user.name[0]}</div>
                <div>
                  <strong>{data.user.name}</strong>
                  <small>
                    {data.user.role === 'couple'
                      ? 'Let’s plan something lovely'
                      : 'Your business workspace'}
                  </small>
                </div>
                <button
                  className="icon-button"
                  aria-label="Sign out"
                  onClick={async () => {
                    if (await mutate('/auth/logout')) {
                      setData(null);
                      navigate('/');
                    }
                  }}
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          </aside>
          <div className="main-shell">
            <header className="topbar">
              <button
                className="icon-button mobile-menu"
                aria-label="Open navigation"
                onClick={() => setMenu(true)}
              >
                <Menu size={22} />
              </button>
              <div className="breadcrumb">
                {data.wedding ? (
                  <>
                    <HeartHandshake size={16} />
                    <span>
                      {data.wedding.partner1} & {data.wedding.partner2}
                    </span>
                    <span className="breadcrumb-divider">/</span>
                    <span className="muted">
                      {navigation.find((n) => n[0] === path)?.[1] ||
                        (path === '/settings' ? 'Settings' : 'Overview')}
                    </span>
                  </>
                ) : (
                  <>
                    <Flower2 size={17} />
                    <span>Vendor workspace</span>
                  </>
                )}
              </div>
              {data.wedding && (
                <a
                  className="topbar-link"
                  href={`/w/${data.wedding.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View wedding website <ArrowUpRight size={15} />
                </a>
              )}
            </header>
            {data.user.demo && <DemoBar />}
            <main className="main-content" key={data.wedding?.id || data.vendor?.id}>
              {data.user.role === 'vendor' ? (
                <VendorWorkspace profile={path === '/profile' || !data.vendor} />
              ) : path === '/guests' ? (
                <Guests />
              ) : path === '/events' ? (
                <Events />
              ) : path === '/planning' ? (
                <Planning />
              ) : path === '/website' ? (
                <Website />
              ) : path === '/budget' ? (
                <BudgetPage />
              ) : path === '/vendors' ? (
                <Vendors />
              ) : path === '/settings' ? (
                <SettingsPage />
              ) : path === '/' || path === '/dashboard' ? (
                <Dashboard />
              ) : (
                <div className="empty">
                  <h1>A little off the path.</h1>
                  <p>This page doesn’t exist.</p>
                  <button className="button primary" onClick={() => navigate('/dashboard')}>
                    Back to overview
                  </button>
                </div>
              )}
            </main>
            <footer className="app-footer">
              <span>Made for the two of you.</span>
              <span>
                ampersand invites <span className="tiny-amp">&</span>
              </span>
            </footer>
          </div>
        </div>
      )}
      {toast && (
        <div
          className={`toast ${toast.error ? 'error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <X size={18} /> : <Check size={18} />}
          <span>{toast.text}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </AppContext.Provider>
  );
}
function Join({ path }: { path: string }) {
  const { mutate, navigate, data } = useApp();
  return (
    <div className="onboarding-page">
      <Brand />
      <div className="card onboarding-card">
        <div className="eyebrow">BETTER, TOGETHER</div>
        <h1>Join the planning.</h1>
        <p>
          You’re signed in as {data.user.email}. Accept this invitation to help bring their day
          together.
        </p>
        <button
          className="button primary"
          onClick={async () => {
            if (await mutate(path, 'POST', {}, 'You’ve joined the wedding.'))
              navigate('/dashboard');
          }}
        >
          Accept invitation <ArrowRight size={16} />
        </button>
        <button className="button secondary" onClick={() => navigate('/dashboard')}>
          Go to my workspace
        </button>
      </div>
    </div>
  );
}
