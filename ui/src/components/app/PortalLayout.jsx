import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  CreditCard,
  Home,
  LogOut,
  MapPinned,
  Menu,
  ShieldAlert,
  UserCircle2,
  Users,
  UserSearch,
  Wrench,
  X,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import logo from "/assets/logo.svg";

import { useAuthStore } from "../../store/authStore";

const iconMap = {
  dashboard: Home,
  profile: UserCircle2,
  elders: UserCircle2,
  subscriptions: CreditCard,
  visits: CalendarDays,
  safety: ShieldAlert,
  workers: Users,
  tracker: MapPinned,
  emergency: ShieldAlert,
  users: UserSearch,
  pending: Bell,
};

function getIcon(label) {
  const key = Object.keys(iconMap).find((item) =>
    label.toLowerCase().includes(item)
  );
  return key ? iconMap[key] : Bell;
}

export default function PortalLayout({ title, links, navClassName }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isWorkerPortal = title === "Worker Portal";
  const isCustomerPortal = title === "Customer Portal";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `ELDERLY | ${title}`;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <div className="min-h-screen bg-[#f7fbfd] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1380px] flex-col lg:flex-row">
        <aside className="border-b border-emerald-100 bg-white/90 p-3 backdrop-blur lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:border-r-emerald-100">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-300 via-cyan-300 to-orange-200 p-[1px] shadow-[0_24px_60px_rgba(70,180,200,0.12)]">
            <div className="rounded-[calc(1.5rem-1px)] bg-white p-4">
              <div className="sm:hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={logo} alt="ELDERLY logo" className="h-10 w-auto shrink-0" />
                    <div className={`min-w-0 ${isCustomerPortal ? "hidden" : ""}`}>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{isWorkerPortal ? title : "ELDERLY"}</p>
                      <h1 className="truncate text-lg font-semibold text-slate-900">{isWorkerPortal ? user?.full_name : title}</h1>
                    </div>
                  </div>
                  {isCustomerPortal ? (
                    <button
                      onClick={() => setMobileMenuOpen(true)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-slate-700 transition hover:bg-emerald-50"
                    >
                      <Menu size={18} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        logout();
                        navigate("/");
                      }}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-white text-slate-700 transition hover:bg-emerald-50"
                    >
                      <LogOut size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden sm:block">
                <img src={logo} alt="ELDERLY logo" className="h-10 w-auto" />
                <p className="mt-3 text-[11px] uppercase tracking-[0.32em] text-emerald-700">ELDERLY</p>
                <h1 className="mt-2 text-xl font-semibold text-slate-900">{title}</h1>
                <p className="mt-1.5 text-sm text-slate-500">{user?.full_name}</p>
              </div>
            </div>
          </div>

          <nav
            className={`mt-5 ${isCustomerPortal ? "hidden sm:grid" : "grid"} gap-1.5 ${
              isWorkerPortal ? (links.length > 2 ? "grid-cols-3" : "grid-cols-2") : ""
            }`}
          >
            {links.map((link) => {
              const Icon = getIcon(link.label);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center ${
                      isWorkerPortal ? "justify-center" : "justify-start"
                    } gap-2 rounded-2xl px-4 py-2.5 text-sm transition ${
                      isActive
                        ? navClassName
                        : "text-slate-600 hover:bg-emerald-50 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon size={18} />
                  {link.label}
                </NavLink>
              );
            })}
          </nav>

          {!isWorkerPortal ? (
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className={`mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-2.5 text-sm text-slate-700 transition hover:bg-emerald-50 ${isCustomerPortal ? "hidden sm:flex" : ""}`}
            >
              <LogOut size={16} />
              Logout
            </button>
          ) : null}
        </aside>

        <main className="flex-1 bg-[radial-gradient(circle_at_top,_rgba(70,180,200,0.18),_transparent_30%),linear-gradient(180deg,_#f9fffd_0%,_#eef8fb_100%)] p-3 sm:p-4 lg:p-5">
          {!isWorkerPortal ? (
            <div className="mb-4 flex items-center justify-between rounded-[1.75rem] border border-white bg-white/80 px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-700">Companion care platform</p>
                <p className="mt-1 text-sm text-slate-500">Unified operations across customer, worker, and admin portals.</p>
              </div>
              <img src={logo} alt="ELDERLY logo" className="hidden h-9 w-auto sm:block" />
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>

      {isCustomerPortal && mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/30 sm:hidden">
          <button type="button" className="absolute inset-0 h-full w-full" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" />
          <aside className="absolute right-0 top-0 flex h-full w-[84vw] max-w-sm flex-col bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-500">Hi,</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900 whitespace-normal">{user?.full_name || "Customer"}</h2>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="mt-6 grid gap-2">
              {links.map((link) => {
                const Icon = getIcon(link.label);
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                        isActive
                          ? navClassName
                          : "text-slate-600 hover:bg-emerald-50 hover:text-slate-900"
                      }`
                    }
                  >
                    <Icon size={18} />
                    {link.label}
                  </NavLink>
                );
              })}
            </nav>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
                navigate("/");
              }}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-700 transition hover:bg-emerald-50"
            >
              <LogOut size={16} />
              Logout
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
