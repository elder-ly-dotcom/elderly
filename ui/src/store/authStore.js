import { create } from "zustand";

const STORAGE_KEY = "elderly-auth";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ACTIVITY_WRITE_THROTTLE_MS = 60 * 1000;

function nowMs() {
  return Date.now();
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function decodeToken(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function loadInitialState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { token: null, user: null, role: null, lastActiveAt: null };
  }
  try {
    const parsed = JSON.parse(raw);
    const tokenPayload = parsed?.token ? decodeToken(parsed.token) : null;
    const tokenExpiresAt = tokenPayload?.exp ? tokenPayload.exp * 1000 : null;
    const lastActiveAt = Number(parsed?.lastActiveAt ?? 0);
    const inactiveTooLong = !lastActiveAt || nowMs() - lastActiveAt > THIRTY_DAYS_MS;
    const tokenExpired = tokenExpiresAt ? tokenExpiresAt <= nowMs() : false;

    if (inactiveTooLong || tokenExpired) {
      clearStoredSession();
      return { token: null, user: null, role: null, lastActiveAt: null };
    }

    return {
      token: parsed.token ?? null,
      user: parsed.user ?? null,
      role: parsed.role ?? null,
      lastActiveAt,
    };
  } catch {
    clearStoredSession();
    return { token: null, user: null, role: null, lastActiveAt: null };
  }
}

function persistState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useAuthStore = create((set) => ({
  ...loadInitialState(),
  setSession: ({ token, user }) => {
    const payload = decodeToken(token);
    const nextState = {
      token,
      user,
      role: payload?.role ?? null,
      lastActiveAt: nowMs(),
    };
    persistState(nextState);
    set(nextState);
  },
  hydrateUser: (user) =>
    set((state) => {
      const nextState = { ...state, user };
      persistState(nextState);
      return nextState;
    }),
  touchActivity: (force = false) =>
    set((state) => {
      if (!state.token) {
        return state;
      }
      const currentTime = nowMs();
      if (!force && state.lastActiveAt && currentTime - state.lastActiveAt < ACTIVITY_WRITE_THROTTLE_MS) {
        return state;
      }
      const nextState = { ...state, lastActiveAt: currentTime };
      persistState(nextState);
      return nextState;
    }),
  enforceInactivityTimeout: () =>
    set((state) => {
      if (!state.token || !state.lastActiveAt) {
        return state;
      }
      if (nowMs() - state.lastActiveAt <= THIRTY_DAYS_MS) {
        return state;
      }
      clearStoredSession();
      return { token: null, user: null, role: null, lastActiveAt: null };
    }),
  logout: () => {
    clearStoredSession();
    set({ token: null, user: null, role: null, lastActiveAt: null });
  },
}));
