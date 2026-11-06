import type { Session, SupportedStorage } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const SAVED_ACCOUNTS_KEY = "birch.saved-accounts.v1";
const SAVED_ACCOUNTS_EVENT = "birch:saved-accounts-changed";

type SavedAccount = {
  id: string;
  name: string;
  session: Session;
  updatedAt: number;
};

export type SavedAccountInfo = Pick<SavedAccount, "id" | "name" | "updatedAt">;

function accountName(session: Session) {
  const metadata = session.user.user_metadata ?? {};
  return String(metadata.name || metadata.username || metadata.full_name || session.user.email?.split("@")[0] || "Account");
}

function readAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_ACCOUNTS_KEY) || "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedAccount => {
      if (!item || typeof item !== "object") return false;
      const account = item as Partial<SavedAccount>;
      return typeof account.id === "string" && typeof account.name === "string" &&
        typeof account.updatedAt === "number" && typeof account.session?.access_token === "string" &&
        typeof account.session?.refresh_token === "string" && account.session?.user?.id === account.id;
    });
  } catch {
    return [];
  }
}

function writeAccounts(accounts: SavedAccount[]) {
  window.localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(accounts));
  window.dispatchEvent(new Event(SAVED_ACCOUNTS_EVENT));
}

export function rememberSession(session: Session) {
  if (typeof window === "undefined" || !session.user?.id || !session.refresh_token) return;
  const accounts = readAccounts().filter(account => account.id !== session.user.id);
  accounts.unshift({ id: session.user.id, name: accountName(session), session, updatedAt: Date.now() });
  writeAccounts(accounts.slice(0, 20));
}

export function listSavedAccounts(): SavedAccountInfo[] {
  return readAccounts()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }));
}

export function subscribeToSavedAccounts(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === SAVED_ACCOUNTS_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(SAVED_ACCOUNTS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SAVED_ACCOUNTS_EVENT, callback);
  };
}

export function forgetSavedAccount(id: string) {
  writeAccounts(readAccounts().filter(account => account.id !== id));
}

export async function activateSavedAccount(id: string) {
  const account = readAccounts().find(item => item.id === id);
  if (!account) return { error: new Error("That saved account is no longer available.") };
  const { data, error } = await supabase.auth.setSession({
    access_token: account.session.access_token,
    refresh_token: account.session.refresh_token,
  });
  if (!error && data.session) rememberSession(data.session);
  return { error };
}

function tabStorage(): SupportedStorage {
  return {
    getItem: key => {
      const current = window.sessionStorage.getItem(key);
      if (current !== null) return current;
      const legacy = window.localStorage.getItem(key);
      if (legacy === null) return null;
      window.sessionStorage.setItem(key, legacy);
      window.localStorage.removeItem(key);
      try {
        const session = JSON.parse(legacy) as Session;
        if (session.user?.id) rememberSession(session);
      } catch {
        // Non-session Auth values, such as the PKCE verifier, remain tab-scoped too.
      }
      return legacy;
    },
    setItem: (key, value) => {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
      try {
        const session = JSON.parse(value) as Session;
        if (session.user?.id) rememberSession(session);
      } catch {
        // Ignore non-JSON Auth values.
      }
    },
    removeItem: key => {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    },
  };
}

type TabAuthInternals = {
  storage: SupportedStorage;
  userStorage?: SupportedStorage;
  broadcastChannel: BroadcastChannel | null;
};

/** Configure the generated client before the router renders, while its async initialization is yielded. */
export function configureTabAuth() {
  if (typeof window === "undefined") return;
  const auth = supabase.auth as unknown as TabAuthInternals;
  const storage = tabStorage();
  auth.storage = storage;
  auth.userStorage = storage;
  auth.broadcastChannel?.close();
  auth.broadcastChannel = null;
}
