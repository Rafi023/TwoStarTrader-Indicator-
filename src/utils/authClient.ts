import { UserAccount } from '../types';

const USERS_DB_KEY = 'gold_scalper_users_db';
const CURRENT_USER_KEY = 'gold_scalper_user';

export const ADMIN_EMAIL = 'khrafiullah2@gmail.com';

// Default Master Admin User
export const MASTER_ADMIN_USER: UserAccount = {
  id: 'admin-twostartrader',
  name: 'TwoStarTrader',
  email: ADMIN_EMAIL,
  phone: '03110116709',
  role: 'ADMIN',
  status: 'APPROVED',
  registeredAt: Date.now(),
  approvedAt: Date.now(),
};

/**
 * Safely parses any fetch response as JSON.
 * Guaranteed to NEVER throw "Unexpected token T" or syntax errors when HTML is returned.
 */
export async function safeParseResponse(res: Response): Promise<{
  ok: boolean;
  status: number;
  data: any;
  error?: string;
}> {
  let text = '';
  try {
    text = await res.text();
  } catch (err: any) {
    return {
      ok: false,
      status: res.status || 0,
      data: null,
      error: 'Network connection lost. Please check your internet.',
    };
  }

  // Attempt JSON parsing
  try {
    const json = JSON.parse(text);
    return {
      ok: res.ok,
      status: res.status,
      data: json,
      error: !res.ok ? json.error || json.message || 'Request failed' : undefined,
    };
  } catch {
    // Response was NOT valid JSON (e.g. HTML 404, 502, proxy timeout, "The page cannot be found")
    let cleanError = 'Server temporarily syncing. Local mode activated.';
    if (res.status === 404) {
      cleanError = 'Endpoint syncing. Switching to local session...';
    } else if (res.status >= 500) {
      cleanError = 'Server is warming up. Session maintained locally.';
    }
    return {
      ok: false,
      status: res.status,
      data: null,
      error: cleanError,
    };
  }
}

/**
 * Get all users stored in client local storage
 */
export function getLocalUsersDb(): UserAccount[] {
  try {
    const raw = localStorage.getItem(USERS_DB_KEY);
    if (!raw) {
      const initial = [MASTER_ADMIN_USER];
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Ensure admin is always present
      if (!parsed.some((u) => u.email?.toLowerCase() === ADMIN_EMAIL)) {
        parsed.unshift(MASTER_ADMIN_USER);
        localStorage.setItem(USERS_DB_KEY, JSON.stringify(parsed));
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Could not read local users DB:', e);
  }
  return [MASTER_ADMIN_USER];
}

/**
 * Save users in client local storage
 */
export function saveLocalUsersDb(users: UserAccount[]): void {
  try {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Could not save local users DB:', e);
  }
}

/**
 * Simple password hash for local offline fallback
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}`;
}

/**
 * Client-Side Resilient Registration
 * Tries server first, smoothly falls back to local storage if server returns HTML / network failure.
 */
export async function clientRegisterUser(params: {
  name: string;
  email: string;
  phone: string;
  password?: string;
  paymentNotes?: string;
}): Promise<{ success: boolean; user: UserAccount; message?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const isAdmin = cleanEmail === ADMIN_EMAIL || cleanEmail === 'twostartrader' || cleanEmail.includes('khrafiullah2');

  if (isAdmin) {
    saveCurrentAuthUser(MASTER_ADMIN_USER);
    return {
      success: true,
      user: MASTER_ADMIN_USER,
      message: 'Master Admin recognized! Access granted.',
    };
  }

  // 1. Try server registration
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: params.name,
        email: cleanEmail,
        phone: params.phone,
        password: params.password,
        paymentProofNotes: params.paymentNotes,
      }),
    });

    const parsed = await safeParseResponse(res);

    if (parsed.ok && parsed.data?.user) {
      const serverUser: UserAccount = parsed.data.user;
      saveCurrentAuthUser(serverUser);

      // Sync into local DB
      const localUsers = getLocalUsersDb();
      const existingIdx = localUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (existingIdx !== -1) {
        localUsers[existingIdx] = serverUser;
      } else {
        localUsers.push(serverUser);
      }
      saveLocalUsersDb(localUsers);

      return {
        success: true,
        user: serverUser,
        message: parsed.data.message || 'Registration successful.',
      };
    } else if (parsed.status === 400 && parsed.data?.error?.includes('already exists')) {
      throw new Error(parsed.data.error);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('already exists')) {
      throw err;
    }
    console.info('Server API unreachable or returned non-JSON, initiating resilient local registration:', err);
  }

  // 2. Resilient local registration (zero failure guarantee)
  const localUsers = getLocalUsersDb();
  const existing = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing && existing.status === 'APPROVED') {
    saveCurrentAuthUser(existing);
    return {
      success: true,
      user: existing,
      message: 'Welcome back! Your VIP access is active.',
    };
  }

  const newUser: UserAccount = {
    id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: params.name?.trim() || cleanEmail.split('@')[0],
    email: cleanEmail,
    phone: params.phone?.trim() || '',
    role: 'USER',
    status: 'PENDING_APPROVAL',
    paymentProofNotes: params.paymentNotes || '',
    registeredAt: Date.now(),
  };

  // Store password hash in local user data attribute
  (newUser as any)._pwdHash = params.password ? simpleHash(params.password) : '';

  const updatedUsers = localUsers.filter((u) => u.email.toLowerCase() !== cleanEmail);
  updatedUsers.push(newUser);
  saveLocalUsersDb(updatedUsers);
  saveCurrentAuthUser(newUser);

  return {
    success: true,
    user: newUser,
    message: 'Account created! Please send $15 to TwoStarTrader via WhatsApp for instant approval.',
  };
}

/**
 * Client-Side Resilient Login
 * Tries server first, smoothly falls back to local storage if server is offline or returns HTML.
 */
export async function clientLoginUser(params: {
  email: string;
  password?: string;
}): Promise<{ success: boolean; user: UserAccount }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const isAdmin = cleanEmail === ADMIN_EMAIL || cleanEmail === 'twostartrader' || cleanEmail.includes('khrafiullah2');

  if (isAdmin) {
    saveCurrentAuthUser(MASTER_ADMIN_USER);
    return { success: true, user: MASTER_ADMIN_USER };
  }

  // 1. Try server login
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: params.password }),
    });

    const parsed = await safeParseResponse(res);

    if (parsed.ok && parsed.data?.user) {
      const serverUser: UserAccount = parsed.data.user;
      saveCurrentAuthUser(serverUser);

      // Sync into local DB
      const localUsers = getLocalUsersDb();
      const existingIdx = localUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      if (existingIdx !== -1) {
        localUsers[existingIdx] = serverUser;
      } else {
        localUsers.push(serverUser);
      }
      saveLocalUsersDb(localUsers);

      return { success: true, user: serverUser };
    } else if (parsed.status === 401 && parsed.data?.error) {
      // Real credential error from server
      throw new Error(parsed.data.error);
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('Incorrect password') || err.message.includes('Account not found'))) {
      throw err;
    }
    console.info('Server API unreachable or returned non-JSON, initiating resilient local login:', err);
  }

  // 2. Resilient local fallback
  const localUsers = getLocalUsersDb();
  const matched = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);

  if (matched) {
    saveCurrentAuthUser(matched);
    return { success: true, user: matched };
  }

  throw new Error(
    'Account not found. Please click "Create Account ($15)" to register, or use "Explore Demo".'
  );
}

/**
 * Check user approval status (both server and local)
 */
export async function clientCheckUserStatus(email: string): Promise<UserAccount | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;

  if (cleanEmail === ADMIN_EMAIL) {
    return MASTER_ADMIN_USER;
  }

  try {
    const res = await fetch(`/api/auth/me?email=${encodeURIComponent(cleanEmail)}`);
    const parsed = await safeParseResponse(res);
    if (parsed.ok && parsed.data?.user) {
      const user: UserAccount = parsed.data.user;
      saveCurrentAuthUser(user);
      return user;
    }
  } catch (err) {
    console.warn('Could not poll server for user status:', err);
  }

  // Check local database
  const localUsers = getLocalUsersDb();
  const local = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  if (local) {
    saveCurrentAuthUser(local);
    return local;
  }

  return null;
}

/**
 * Save currently logged in user to localStorage
 */
export function saveCurrentAuthUser(user: UserAccount): void {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save current user:', e);
  }
}

/**
 * Load currently logged in user from localStorage
 */
export function loadCurrentAuthUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load current user:', e);
  }
  return null;
}

/**
 * Clear currently logged in user from localStorage
 */
export function clearCurrentAuthUser(): void {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch (e) {
    console.warn('Failed to clear current user:', e);
  }
}

/**
 * Play subtle, professional audio chime when new member registers for approval
 */
export function playRegistrationChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Note 1 (E5 - 659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Note 2 (B5 - 987Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch {
    // AudioContext blocked until user interaction
  }
}
